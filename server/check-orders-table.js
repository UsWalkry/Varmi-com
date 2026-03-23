// Check orders table structure
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkOrdersTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔗 Connected to MySQL database');

    // Check table structure
    const [columns] = await connection.execute('DESCRIBE orders');
    console.log('📋 Orders table structure:');
    console.table(columns);

    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

checkOrdersTable();