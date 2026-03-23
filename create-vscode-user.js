// Create VS Code MySQL user via backend connection
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'server', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4'
});

async function query(sql) {
  const [results] = await pool.execute(sql);
  return results;
}

async function createVSCodeUser() {
  try {
    console.log('Creating vscode user...');
    
    // Create user with password
    await query("CREATE USER IF NOT EXISTS 'vscode'@'%' IDENTIFIED BY 'vscode123'");
    await query("CREATE USER IF NOT EXISTS 'vscode'@'localhost' IDENTIFIED BY 'vscode123'");
    await query("CREATE USER IF NOT EXISTS 'vscode'@'127.0.0.1' IDENTIFIED BY 'vscode123'");
    
    // Grant all privileges
    await query("GRANT ALL PRIVILEGES ON *.* TO 'vscode'@'%' WITH GRANT OPTION");
    await query("GRANT ALL PRIVILEGES ON *.* TO 'vscode'@'localhost' WITH GRANT OPTION");
    await query("GRANT ALL PRIVILEGES ON *.* TO 'vscode'@'127.0.0.1' WITH GRANT OPTION");
    
    await query("FLUSH PRIVILEGES");
    
    console.log('✅ VS Code user created successfully!');
    console.log('');
    console.log('VS Code MySQL Extension settings:');
    console.log('  Host: 127.0.0.1');
    console.log('  Port: 3306');
    console.log('  Username: vscode');
    console.log('  Password: vscode123');
    console.log('  Database: varmi_db');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createVSCodeUser();
