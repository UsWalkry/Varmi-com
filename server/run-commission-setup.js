import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// XAMPP credentials (port 3307)
const config = {
  host: 'localhost',
  port: 3307, // XAMPP custom port
  user: 'root',
  password: '', // XAMPP default no password
  database: 'varmi_db', // Database name from .env
  multipleStatements: true
};

async function runSQL() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log('📍 Config:', { ...config, password: '***' });
    
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Read SQL file
    const sqlPath = join(__dirname, '../create_commission_system.sql');
    console.log('📄 Reading SQL file:', sqlPath);
    
    const sql = readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    console.log('⚙️ Executing SQL statements...');
    await connection.query(sql);
    
    console.log('✅ Commission system setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runSQL();
