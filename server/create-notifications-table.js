import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  charset: 'utf8mb4'
};

async function createNotificationsTable() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log('📍 Host:', dbConfig.host);
    console.log('📍 Port:', dbConfig.port);
    console.log('📍 Database:', dbConfig.database);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully\n');

    // Create notifications table
    console.log('📋 Creating notifications table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON DEFAULT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Notifications table created successfully');

    // Add comment
    await connection.execute(`
      ALTER TABLE notifications COMMENT = 'User notifications for all email and system events'
    `);
    console.log('✅ Table comment added');

    // Check table structure
    console.log('\n📊 Checking table structure...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM notifications
    `);
    
    console.log('\n📋 Notifications Table Columns:');
    console.table(columns);

    console.log('\n🎉 Notifications table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Database connection closed');
    }
  }
}

// Run the script
createNotificationsTable();
