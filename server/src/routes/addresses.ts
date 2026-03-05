import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Ensure table exists (idempotent) and matches users.id type/charset/collation
async function ensureAddressesTable() {
  try {
    // Read users.id definition
    const usersIdMetaArr = await query(
      `SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
       FROM information_schema.COLUMNS
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'id' LIMIT 1`
    );
    const usersIdMeta = Array.isArray(usersIdMetaArr) && usersIdMetaArr[0] ? (usersIdMetaArr as any[])[0] : null;

    let userIdColDef = 'VARCHAR(255) NOT NULL';
    if (usersIdMeta) {
      const dt = String(usersIdMeta.DATA_TYPE || '').toLowerCase();
      const len = usersIdMeta.CHARACTER_MAXIMUM_LENGTH ? Number(usersIdMeta.CHARACTER_MAXIMUM_LENGTH) : undefined;
      const colType = usersIdMeta.COLUMN_TYPE as string | undefined; // e.g. 'char(36)'
      const cs = usersIdMeta.CHARACTER_SET_NAME as string | undefined;
      const coll = usersIdMeta.COLLATION_NAME as string | undefined;

      if (dt === 'char' || dt === 'varchar') {
        // Prefer exact COLUMN_TYPE text to keep length
        const typeExpr = colType || `${dt}(${len || 255})`;
        const csExpr = cs ? ` CHARACTER SET ${cs}` : '';
        const collExpr = coll ? ` COLLATE ${coll}` : '';
        userIdColDef = `${typeExpr}${csExpr}${collExpr} NOT NULL`;
      } else if (dt === 'binary' || dt === 'varbinary') {
        const typeExpr = colType || `${dt}(${len || 36})`;
        userIdColDef = `${typeExpr} NOT NULL`;
      } else {
        // Fallback
        userIdColDef = 'VARCHAR(255) NOT NULL';
      }
    }

    // Check if table exists
    const tableExistsArr = await query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_addresses' LIMIT 1`
    );
    const tableExists = Array.isArray(tableExistsArr) && tableExistsArr.length > 0;

    if (!tableExists) {
      // Create with matching user_id definition
      const ddl = `
        CREATE TABLE IF NOT EXISTS user_addresses (
          id CHAR(36) NOT NULL,
          user_id ${userIdColDef},
          title VARCHAR(100) DEFAULT NULL,
          recipient_name VARCHAR(150) DEFAULT NULL,
          phone VARCHAR(32) DEFAULT NULL,
          address_line1 VARCHAR(255) NOT NULL,
          address_line2 VARCHAR(255) DEFAULT NULL,
          district VARCHAR(100) DEFAULT NULL,
          city VARCHAR(100) DEFAULT NULL,
          postal_code VARCHAR(20) DEFAULT NULL,
          country VARCHAR(2) DEFAULT 'TR',
          is_default TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_user_addresses_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      await query(ddl);
    } else {
      // Verify user_id column matches; if not, alter
      const uaColMetaArr = await query(
        `SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
         FROM information_schema.COLUMNS
         WHERE table_schema = DATABASE() AND table_name = 'user_addresses' AND column_name = 'user_id' LIMIT 1`
      );
      const uaCol = Array.isArray(uaColMetaArr) && uaColMetaArr[0] ? (uaColMetaArr as any[])[0] : null;
      const uaType = uaCol?.COLUMN_TYPE as string | undefined;
      const uaCS = uaCol?.CHARACTER_SET_NAME as string | undefined;
      const uaColl = uaCol?.COLLATION_NAME as string | undefined;

      // Extract desired parts from userIdColDef
      const desired = userIdColDef.replace(' NOT NULL','');

      const mismatch = !uaCol || !uaType || !desired.toLowerCase().includes(uaType.toLowerCase());
      if (mismatch) {
        // Drop FK if exists
        const fkRowArr = await query(
          `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
           WHERE CONSTRAINT_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'fk_user_addresses_user' AND TABLE_NAME = 'user_addresses' LIMIT 1`
        );
        const fkExists = Array.isArray(fkRowArr) && fkRowArr.length > 0;
        if (fkExists) {
          await query(`ALTER TABLE user_addresses DROP FOREIGN KEY fk_user_addresses_user`);
        }

        await query(`ALTER TABLE user_addresses MODIFY COLUMN user_id ${userIdColDef}`);
      }
    }

    // Ensure FK exists
    const fkCheckArr = await query(
      `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'user_addresses' AND CONSTRAINT_NAME = 'fk_user_addresses_user' LIMIT 1`
    );
    const fkExists = Array.isArray(fkCheckArr) && fkCheckArr.length > 0;
    if (!fkExists) {
      await query(
        `ALTER TABLE user_addresses
         ADD CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
      );
    }
  } catch (err) {
    console.error('ensureAddressesTable error:', err);
  }
}

// List addresses for current user
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    await ensureAddressesTable();
    const userId = req.user?.userId || (req as any).userId || (req as any).user?.id;
    const rows = await query(
      `SELECT id, user_id, title, recipient_name, phone, address_line1, address_line2, district, city, postal_code, country, is_default, created_at, updated_at 
       FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    );
    res.json({ success: true, addresses: rows });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, error: 'Adresler alınamadı' });
  }
});

// Create address
router.post('/', authenticateToken, async (req: any, res) => {
  try {
    await ensureAddressesTable();
    const userId = req.user?.userId || (req as any).userId || (req as any).user?.id;
    const {
      title,
      recipient_name,
      phone,
      address_line1,
      address_line2,
      district,
      city,
      postal_code,
      country,
      is_default,
    } = req.body || {};

    if (!address_line1) {
      return res.status(400).json({ success: false, error: 'Adres satırı (address_line1) gereklidir' });
    }

    const id = uuidv4();

    // If setting as default, reset others
    if (is_default) {
      await query(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
    }

    await query(
      `INSERT INTO user_addresses (id, user_id, title, recipient_name, phone, address_line1, address_line2, district, city, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [id, userId, title || null, recipient_name || null, phone || null, address_line1, address_line2 || null, district || null, city || null, postal_code || null, (country || 'TR'), is_default ? 1 : 0]
    );

    const created = await query(`SELECT * FROM user_addresses WHERE id = ?`, [id]);
    res.json({ success: true, address: Array.isArray(created) ? created[0] : created });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ success: false, error: 'Adres oluşturulamadı' });
  }
});

// Update address
router.put('/:id', authenticateToken, async (req: any, res) => {
  try {
    await ensureAddressesTable();
    const userId = req.user?.userId || (req as any).userId || (req as any).user?.id;
    const { id } = req.params;
    const existing = await query(`SELECT * FROM user_addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    const existingRows = Array.isArray(existing) ? (existing as any[]) : [];
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Adres bulunamadı' });
    }

    const {
      title,
      recipient_name,
      phone,
      address_line1,
      address_line2,
      district,
      city,
      postal_code,
      country,
      is_default,
    } = req.body || {};

    if (is_default) {
      await query(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
    }

    await query(
      `UPDATE user_addresses 
       SET title = ?, recipient_name = ?, phone = ?, address_line1 = ?, address_line2 = ?, district = ?, city = ?, postal_code = ?, country = ?, is_default = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [title || null, recipient_name || null, phone || null, address_line1 || existingRows[0].address_line1, address_line2 || null, district || null, city || null, postal_code || null, (country || 'TR'), is_default ? 1 : 0, id, userId]
    );

    const updated = await query(`SELECT * FROM user_addresses WHERE id = ?`, [id]);
    res.json({ success: true, address: Array.isArray(updated) ? updated[0] : updated });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, error: 'Adres güncellenemedi' });
  }
});

// Delete address
router.delete('/:id', authenticateToken, async (req: any, res) => {
  try {
    await ensureAddressesTable();
    const userId = req.user?.userId || (req as any).userId || (req as any).user?.id;
    const { id } = req.params;
    const existing = await query(`SELECT id FROM user_addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Adres bulunamadı' });
    }

    await query(`DELETE FROM user_addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, error: 'Adres silinemedi' });
  }
});

// Set default address
router.post('/:id/default', authenticateToken, async (req: any, res) => {
  try {
    await ensureAddressesTable();
    const userId = req.user?.userId || (req as any).userId || (req as any).user?.id;
    const { id } = req.params;
    const existing = await query(`SELECT id FROM user_addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Adres bulunamadı' });
    }

    await query(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
    await query(`UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
    const updated = await query(`SELECT * FROM user_addresses WHERE id = ?`, [id]);
    res.json({ success: true, address: Array.isArray(updated) ? updated[0] : updated });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ success: false, error: 'Varsayılan adres ayarlanamadı' });
  }
});

export default router;
