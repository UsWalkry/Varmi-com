// Add inactive to offers status enum
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateStatusEnum() {
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

    console.log('🔗 Connected to MySQL database\n');

    // Check current enum
    const [cols] = await connection.execute(
      "SHOW COLUMNS FROM offers WHERE Field = 'status'"
    );
    console.log('📋 Current status enum:');
    console.table(cols);

    // Update enum to include inactive
    console.log('\n🔧 Adding inactive to status enum...');
    await connection.execute(
      `ALTER TABLE offers 
       MODIFY COLUMN status ENUM('inactive', 'active', 'accepted', 'rejected', 'withdrawn', 'expired') 
       DEFAULT 'inactive'`
    );
    console.log('✅ Status enum updated');

    // Verify
    const [newCols] = await connection.execute(
      "SHOW COLUMNS FROM offers WHERE Field = 'status'"
    );
    console.log('\n📊 New status enum:');
    console.table(newCols);

    // Update pending offers to inactive
    console.log('\n🔧 Updating pending offers to inactive...');
    const [result] = await connection.execute(
      `UPDATE offers 
       SET status = 'inactive' 
       WHERE approval_status = 'pending'`
    );
    console.log('✅ Updated', result.affectedRows, 'offers');

    // Check pending offers
    const [pending] = await connection.execute(
      `SELECT id, product_name, approval_status, status 
       FROM offers 
       WHERE approval_status = 'pending'`
    );
    console.log('\n📋 Pending offers:');
    console.table(pending);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

updateStatusEnum();
