import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  multipleStatements: true
};

async function runUpdate() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');
    
    const sqlFilePath = join(__dirname, '..', 'update_commission_used_column.sql');
    console.log('📄 Reading SQL file:', sqlFilePath);
    
    const sql = readFileSync(sqlFilePath, 'utf8');
    
    console.log('⚙️ Executing SQL statements...');
    await connection.query(sql);
    
    console.log('✅ Commission_used column added successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runUpdate();
