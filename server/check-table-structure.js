import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function checkTables() {
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

    // Check users table
    console.log('📋 users table structure:');
    const [usersColumns] = await connection.query('DESCRIBE users');
    console.table(usersColumns);

    // Check listings table
    console.log('\n📋 listings table structure:');
    const [listingsColumns] = await connection.query('DESCRIBE listings');
    console.table(listingsColumns);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();
