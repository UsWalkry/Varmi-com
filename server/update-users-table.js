// Execute users table update script
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function updateUsersTable() {
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

    // Read the SQL update script
    const sqlFilePath = path.join(process.cwd(), '..', 'update_users_table_firstname_lastname.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📜 Running users table update script...');

    // Split SQL script into individual statements and execute them
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`🔧 Executing: ${statement.substring(0, 60)}...`);
          const [result] = await connection.execute(statement);
          console.log('✅ Success');
          
          // If it's a DESCRIBE statement, show the result
          if (statement.toUpperCase().startsWith('DESCRIBE')) {
            console.table(result);
          }
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log('⚠️  Already exists or already dropped, skipping');
          } else {
            console.error('❌ Error:', error.message);
          }
        }
      }
    }

    console.log('🎉 Users table update completed!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateUsersTable();