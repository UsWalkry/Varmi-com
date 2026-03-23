// Check database connection and users
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkDB() {
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
    console.log('📊 Database info:', {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    // Check users table
    const [users] = await connection.execute('SELECT id, email, name FROM users LIMIT 5');
    console.log('👥 Users in database:');
    console.table(users);

    // Check orders table structure
    const [structure] = await connection.execute('DESCRIBE orders');
    console.log('📋 Current orders table structure:');
    console.table(structure);

    // Check if new tables exist
    try {
      const [auditCheck] = await connection.execute('DESCRIBE order_status_audit');
      console.log('✅ order_status_audit table exists');
    } catch (error) {
      console.log('❌ order_status_audit table does NOT exist');
    }

    try {
      const [notifCheck] = await connection.execute('DESCRIBE order_notifications');
      console.log('✅ order_notifications table exists');
    } catch (error) {
      console.log('❌ order_notifications table does NOT exist');
    }

    // Check current orders
    const [orders] = await connection.execute(`
      SELECT o.*, COUNT(oi.id) as item_count 
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      WHERE o.user_id = ?
      GROUP BY o.id
    `, ['6dca2abb-12e0-4439-8f80-f83c6fbdb961']);
    
    console.log('📦 Current orders for user 6dca2abb-12e0-4439-8f80-f83c6fbdb961:');
    console.table(orders);

    await connection.end();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

checkDB();