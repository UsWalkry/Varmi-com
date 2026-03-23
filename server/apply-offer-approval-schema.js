// Apply offer approval system schema
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function applyOfferApprovalSchema() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4',
      multipleStatements: true
    });

    console.log('🔗 Connected to MySQL database');

    // Read the SQL update script
    const sqlFilePath = path.join(process.cwd(), '..', 'add_offer_approval_system.sql');
    console.log('📂 Reading SQL file:', sqlFilePath);
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      return;
    }
    
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📜 Applying offer approval system schema...');

    // Split SQL script into individual statements and execute them
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const preview = statement.substring(0, 80).replace(/\n/g, ' ');
          console.log(`🔧 Executing: ${preview}...`);
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️  Already exists, skipping');
          } else {
            console.error('❌ Error:', error.message);
            console.error('   Code:', error.code);
          }
        }
      }
    }

    console.log('\n🎉 Offer approval system schema applied!');

    // Verify the columns exist
    console.log('\n🔍 Verifying schema...');
    try {
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM offers WHERE Field IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason')"
      );
      console.log('✅ Offers table columns:', columns.map(c => c.Field).join(', '));
    } catch (error) {
      console.log('❌ Could not verify offers table:', error.message);
    }

    try {
      const [auditCheck] = await connection.execute('SELECT COUNT(*) as count FROM offer_approval_audit LIMIT 1');
      console.log('✅ offer_approval_audit table is working');
    } catch (error) {
      console.log('❌ offer_approval_audit table issue:', error.message);
    }

    try {
      const [notifCheck] = await connection.execute(
        "SELECT COUNT(*) as count FROM admin_notifications WHERE type IN ('new_offer', 'offer_resubmitted') LIMIT 1"
      );
      console.log('✅ admin_notifications table supports offer types');
    } catch (error) {
      console.log('⚠️  admin_notifications check:', error.message);
    }

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

applyOfferApprovalSchema();
