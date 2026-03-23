import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function checkCharset() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to MySQL database\n');

    // Check users table charset
    const [usersInfo] = await connection.query(`
      SELECT 
        TABLE_NAME,
        ENGINE,
        TABLE_COLLATION
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'varmi_db' AND TABLE_NAME = 'users'
    `);
    console.log('📋 users table info:');
    console.table(usersInfo);

    // Check listings table charset
    const [listingsInfo] = await connection.query(`
      SELECT 
        TABLE_NAME,
        ENGINE,
        TABLE_COLLATION
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'varmi_db' AND TABLE_NAME = 'listings'
    `);
    console.log('\n📋 listings table info:');
    console.table(listingsInfo);

    // Check foreign key constraints on listings
    const [fkInfo] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'varmi_db' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME = 'listings'
    `);
    console.log('\n📋 listings foreign keys:');
    console.table(fkInfo);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCharset();
