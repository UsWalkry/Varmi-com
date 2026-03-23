// Run database schema update
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function updateSchema() {
  try {
    const connection = await mysql.createConnection({
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
    const sqlFilePath = path.join(process.cwd(), '..', 'update_order_status_system.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📜 Running database update script...');

    // Split SQL script into individual statements and execute them
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`🔧 Executing: ${statement.substring(0, 60)}...`);
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  Already exists, skipping');
          } else {
            console.error('❌ Error:', error.message);
          }
        }
      }
    }

    console.log('🎉 Database schema update completed!');

    // Verify the new tables exist
    try {
      const [auditCheck] = await connection.execute('SELECT COUNT(*) as count FROM order_status_audit LIMIT 1');
      console.log('✅ order_status_audit table is working');
    } catch (error) {
      console.log('❌ order_status_audit table still has issues:', error.message);
    }

    try {
      const [notifCheck] = await connection.execute('SELECT COUNT(*) as count FROM order_notifications LIMIT 1');
      console.log('✅ order_notifications table is working');
    } catch (error) {
      console.log('❌ order_notifications table still has issues:', error.message);
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database connection error:', error);
  }
}

updateSchema();