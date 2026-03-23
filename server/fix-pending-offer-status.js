// Fix pending offer with empty status
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixOfferStatus() {
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

    // Find offers with pending approval but wrong status
    const [pendingOffers] = await connection.execute(
      `SELECT id, product_name, approval_status, status 
       FROM offers 
       WHERE approval_status = 'pending'`
    );

    console.log('📋 Pending offers found:', pendingOffers.length);
    console.table(pendingOffers);

    // Fix status for pending offers
    const [result] = await connection.execute(
      `UPDATE offers 
       SET status = 'inactive' 
       WHERE approval_status = 'pending' 
       AND (status != 'inactive' OR status IS NULL OR status = '')`
    );

    console.log('\n✅ Fixed', result.affectedRows, 'offers');

    // Verify
    const [updated] = await connection.execute(
      `SELECT id, product_name, approval_status, status 
       FROM offers 
       WHERE approval_status = 'pending'`
    );

    console.log('\n📊 After update:');
    console.table(updated);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Connection closed');
    }
  }
}

fixOfferStatus();
