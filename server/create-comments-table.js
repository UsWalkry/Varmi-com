import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function createCommentsTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to MySQL database');

    // Read SQL file
    const sqlFilePath = join(__dirname, '..', 'create_listing_comments.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Executing SQL from create_listing_comments.sql...');

    // Execute SQL
    await connection.query(sql);

    console.log('✅ listing_comments table created successfully!');

    // Verify table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'listing_comments'"
    );

    if (tables.length > 0) {
      console.log('✅ Verified: listing_comments table exists');
      
      // Show table structure
      const [columns] = await connection.query('DESCRIBE listing_comments');
      console.log('\n📋 Table structure:');
      console.table(columns);
    } else {
      console.log('❌ Table not found after creation');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

createCommentsTable();
