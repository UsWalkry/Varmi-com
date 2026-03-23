// Run users birth_date schema update
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function updateUsersBirthdate() {
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

    const sqlFilePath = path.join(process.cwd(), '..', 'update_users_table_add_birthdate.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📜 Running users birth_date update script...');

    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;
      try {
        console.log(`🔧 Executing: ${statement.substring(0, 60)}...`);
        await connection.execute(statement);
        console.log('✅ Success');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  birth_date column already exists, skipping');
        } else {
          console.error('❌ Error:', error.message);
        }
      }
    }

    console.log('🎉 Users table birth_date update completed!');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateUsersBirthdate();
