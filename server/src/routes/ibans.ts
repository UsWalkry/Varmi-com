import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// ── Tablo yoksa oluştur (migration güvencesi) ─────────────────
(async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_ibans (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(100) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        iban VARCHAR(32) NOT NULL,
        account_holder_name VARCHAR(150) NOT NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_ibans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_ibans_user (user_id),
        UNIQUE KEY uq_user_iban (user_id, iban)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, []);
    console.log('✅ user_ibans tablosu hazır');
  } catch (err: any) {
    // Tablo zaten varsa (FK hatası dahil) sessizce geç
    if (!err?.message?.includes('already exists')) {
      console.warn('⚠️ user_ibans tablo oluşturma uyarısı:', err?.message);
    }
  }
})();

// ──────────────────────────────────────────────────────────────
// GET /api/ibans  →  Kullanıcının tüm IBAN'larını listele
// ──────────────────────────────────────────────────────────────
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const rows = await query(
      `SELECT id, user_id, title, bank_name, iban, account_holder_name, is_default, created_at
         FROM user_ibans
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at DESC`,
      [userId]
    ) as any[];

    return res.json({ success: true, ibans: rows });
  } catch (err) {
    console.error('❌ IBAN listele hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/ibans  →  Yeni IBAN ekle
// ──────────────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { title, bankName, iban, accountHolderName, isDefault } = req.body;

    // Zorunlu alan kontrolleri
    if (!title || !bankName || !iban || !accountHolderName) {
      return res.status(400).json({
        success: false,
        error: 'title, bankName, iban ve accountHolderName zorunludur'
      });
    }

    // IBAN format kontrolü: TR + 24 rakam
    const ibanCleaned = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(ibanCleaned)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz IBAN formatı. TR ile başlamalı ve 26 karakter (TR + 24 rakam) olmalı.'
      });
    }

    // Kullanıcı başına IBAN sayısı sınırı (maksimum 10)
    const countRows = await query(
      'SELECT COUNT(*) AS cnt FROM user_ibans WHERE user_id = ?',
      [userId]
    ) as any[];
    if ((countRows[0]?.cnt ?? 0) >= 10) {
      return res.status(400).json({
        success: false,
        error: 'En fazla 10 IBAN kaydedebilirsiniz.'
      });
    }

    // Aynı IBAN zaten kayıtlı mı?
    const existRows = await query(
      'SELECT id FROM user_ibans WHERE user_id = ? AND iban = ?',
      [userId, ibanCleaned]
    ) as any[];
    if (existRows.length > 0) {
      return res.status(400).json({ success: false, error: 'Bu IBAN zaten kayıtlı.' });
    }

    // Varsayılan ayarlıysa önce diğerlerini sıfırla
    if (isDefault) {
      await query('UPDATE user_ibans SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    const id = uuidv4();
    await query(
      `INSERT INTO user_ibans (id, user_id, title, bank_name, iban, account_holder_name, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title.trim(), bankName.trim(), ibanCleaned, accountHolderName.trim(), isDefault ? 1 : 0]
    );

    console.log(`✅ IBAN eklendi: user=${userId}, iban=${ibanCleaned}`);
    return res.status(201).json({ success: true, id, message: 'IBAN başarıyla eklendi.' });
  } catch (err) {
    console.error('❌ IBAN ekleme hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/ibans/:id/default  →  Varsayılan IBAN olarak işaretle
// ──────────────────────────────────────────────────────────────
router.patch('/:id/default', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // IBAN kullanıcıya ait mi kontrol et
    const rows = await query(
      'SELECT id FROM user_ibans WHERE id = ? AND user_id = ?',
      [id, userId]
    ) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'IBAN bulunamadı.' });
    }

    // Önce tümü sıfırla, sonra seçileni işaretle
    await query('UPDATE user_ibans SET is_default = 0 WHERE user_id = ?', [userId]);
    await query('UPDATE user_ibans SET is_default = 1 WHERE id = ?', [id]);

    return res.json({ success: true, message: 'Varsayılan IBAN güncellendi.' });
  } catch (err) {
    console.error('❌ Varsayılan IBAN güncelleme hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE /api/ibans/:id  →  IBAN sil
// ──────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM user_ibans WHERE id = ? AND user_id = ?',
      [id, userId]
    ) as any;

    if ((result?.affectedRows ?? 0) === 0) {
      return res.status(404).json({ success: false, error: 'IBAN bulunamadı.' });
    }

    console.log(`🗑️ IBAN silindi: id=${id}, user=${userId}`);
    return res.json({ success: true, message: 'IBAN silindi.' });
  } catch (err) {
    console.error('❌ IBAN silme hatası:', err);
    return res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

export default router;

