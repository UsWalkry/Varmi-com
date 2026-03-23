// Direct SQL execution for offer approval system
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function applySchema() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔗 Connected to MySQL database');

    // Helper function to check if column exists
    async function columnExists(table, column) {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
        [table, column]
      );
      return rows[0].count > 0;
    }

    // Helper function to check if index exists
    async function indexExists(table, indexName) {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND INDEX_NAME = ?`,
        [table, indexName]
      );
      return rows[0].count > 0;
    }

    console.log('\n📋 Step 1: Adding approval_status column...');
    if (!(await columnExists('offers', 'approval_status'))) {
      await connection.execute(
        `ALTER TABLE offers ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER status`
      );
      console.log('✅ Added approval_status column');
    } else {
      console.log('⚠️  approval_status column already exists');
    }

    console.log('\n📋 Step 2: Adding approved_by column...');
    if (!(await columnExists('offers', 'approved_by'))) {
      await connection.execute(
        `ALTER TABLE offers ADD COLUMN approved_by VARCHAR(36) NULL AFTER approval_status`
      );
      console.log('✅ Added approved_by column');
    } else {
      console.log('⚠️  approved_by column already exists');
    }

    console.log('\n📋 Step 3: Adding approved_at column...');
    if (!(await columnExists('offers', 'approved_at'))) {
      await connection.execute(
        `ALTER TABLE offers ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by`
      );
      console.log('✅ Added approved_at column');
    } else {
      console.log('⚠️  approved_at column already exists');
    }

    console.log('\n📋 Step 4: Adding rejection_reason column...');
    if (!(await columnExists('offers', 'rejection_reason'))) {
      await connection.execute(
        `ALTER TABLE offers ADD COLUMN rejection_reason TEXT NULL AFTER approved_at`
      );
      console.log('✅ Added rejection_reason column');
    } else {
      console.log('⚠️  rejection_reason column already exists');
    }

    console.log('\n📋 Step 5: Adding indexes...');
    if (!(await indexExists('offers', 'idx_approval_status'))) {
      await connection.execute(
        `ALTER TABLE offers ADD INDEX idx_approval_status (approval_status)`
      );
      console.log('✅ Added idx_approval_status index');
    } else {
      console.log('⚠️  idx_approval_status index already exists');
    }

    if (!(await indexExists('offers', 'idx_approved_by'))) {
      await connection.execute(
        `ALTER TABLE offers ADD INDEX idx_approved_by (approved_by)`
      );
      console.log('✅ Added idx_approved_by index');
    } else {
      console.log('⚠️  idx_approved_by index already exists');
    }

    console.log('\n📋 Step 6: Migrating existing active offers...');
    const [result] = await connection.execute(
      `UPDATE offers 
       SET approval_status = 'approved', 
           approved_at = created_at 
       WHERE status = 'active' AND approval_status = 'pending'`
    );
    console.log(`✅ Migrated ${result.affectedRows} existing active offers`);

    console.log('\n📋 Step 7: Creating offer_approval_audit table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS offer_approval_audit (
        id VARCHAR(36) PRIMARY KEY,
        offer_id VARCHAR(36) NOT NULL,
        action ENUM('approved', 'rejected', 'resubmitted') NOT NULL,
        performed_by VARCHAR(36) NOT NULL,
        reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_offer_id (offer_id),
        INDEX idx_performed_by (performed_by),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ offer_approval_audit table ready');

    console.log('\n📋 Step 8: Updating admin_notifications type enum...');
    await connection.execute(
      `ALTER TABLE admin_notifications 
       MODIFY COLUMN type ENUM('new_listing', 'listing_resubmitted', 'new_offer', 'offer_resubmitted', 'other') NOT NULL`
    );
    console.log('✅ Updated admin_notifications type enum');

    console.log('\n📋 Step 9: Adding offer_id to admin_notifications...');
    if (!(await columnExists('admin_notifications', 'offer_id'))) {
      await connection.execute(
        `ALTER TABLE admin_notifications ADD COLUMN offer_id VARCHAR(36) NULL AFTER listing_id`
      );
      console.log('✅ Added offer_id column');
    } else {
      console.log('⚠️  offer_id column already exists');
    }

    if (!(await indexExists('admin_notifications', 'idx_offer_id'))) {
      await connection.execute(
        `ALTER TABLE admin_notifications ADD INDEX idx_offer_id (offer_id)`
      );
      console.log('✅ Added idx_offer_id index');
    } else {
      console.log('⚠️  idx_offer_id index already exists');
    }

    console.log('\n📋 Step 10: Creating pending_offers_view...');
    await connection.execute(`DROP VIEW IF EXISTS pending_offers_view`);
    await connection.execute(`
      CREATE VIEW pending_offers_view AS
      SELECT 
        o.id,
        o.listing_id,
        o.seller_id,
        o.price,
        o.quantity,
        o.product_name,
        o.description,
        o.offer_condition,
        o.delivery_type,
        o.shipping_cost,
        o.images,
        o.created_at,
        o.approval_status,
        o.status,
        u.email as seller_email,
        u.firstName as seller_first_name,
        u.lastName as seller_last_name,
        u.phone as seller_phone,
        l.title as listing_title,
        l.buyer_id as listing_owner_id,
        buyer.email as listing_owner_email,
        buyer.firstName as listing_owner_first_name,
        buyer.lastName as listing_owner_last_name
      FROM offers o
      JOIN users u ON o.seller_id = u.id
      JOIN listings l ON o.listing_id = l.id
      JOIN users buyer ON l.buyer_id = buyer.id
      WHERE o.approval_status = 'pending'
    `);
    console.log('✅ pending_offers_view created');

    console.log('\n🔍 Verifying schema...');
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM offers WHERE Field IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason')`
    );
    console.log('✅ Offers table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    const [[auditCount]] = await connection.execute('SELECT COUNT(*) as count FROM offer_approval_audit');
    console.log(`✅ offer_approval_audit table working (${auditCount.count} records)`);

    const [[notifCount]] = await connection.execute(
      `SELECT COUNT(*) as count FROM admin_notifications WHERE type IN ('new_offer', 'offer_resubmitted')`
    );
    console.log(`✅ admin_notifications supports offer types (${notifCount.count} offer notifications)`);

    console.log('\n🎉 Offer approval system successfully installed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

applySchema();
