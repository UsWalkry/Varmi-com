// Run fixed database schema update with correct data types
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createTables() {
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

    // First, let's check the data types of existing tables
    const [ordersDesc] = await connection.execute('DESCRIBE orders');
    const [usersDesc] = await connection.execute('DESCRIBE users');
    
    console.log('📋 Orders table ID type:', ordersDesc.find(col => col.Field === 'id'));
    console.log('👥 Users table ID type:', usersDesc.find(col => col.Field === 'id'));

    // Create order_status_audit table with correct data types
    console.log('🔧 Creating order_status_audit table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_status_audit (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          previous_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          changed_by VARCHAR(36) NOT NULL,
          change_reason TEXT,
          tracking_number VARCHAR(100),
          carrier_company VARCHAR(100),
          estimated_delivery DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_id_audit (order_id),
          INDEX idx_changed_by (changed_by),
          INDEX idx_created_at_audit (created_at),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ order_status_audit table created');

    // Create order_notifications table with correct data types
    console.log('🔧 Creating order_notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_notifications (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          order_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          notification_type ENUM('status_change', 'shipping_info', 'delivery_reminder', 'completion_request') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          email_sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_order_notifications_order (order_id),
          INDEX idx_order_notifications_user (user_id),
          INDEX idx_order_notifications_type (notification_type),
          INDEX idx_order_notifications_read (is_read),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ order_notifications table created');

    // Verify tables exist and work
    try {
      const [auditTest] = await connection.execute('SELECT COUNT(*) as count FROM order_status_audit');
      console.log('✅ order_status_audit table is working, records:', auditTest[0].count);
    } catch (error) {
      console.log('❌ order_status_audit test failed:', error.message);
    }

    try {
      const [notifTest] = await connection.execute('SELECT COUNT(*) as count FROM order_notifications');
      console.log('✅ order_notifications table is working, records:', notifTest[0].count);
    } catch (error) {
      console.log('❌ order_notifications test failed:', error.message);
    }

    await connection.end();
    console.log('🎉 Database schema update completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTables();