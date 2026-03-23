import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkPhone() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'varmi_db',
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  });

  console.log('🔍 5398465861 numarasını arıyorum...');
  
  // Farklı formatlarda ara
  const formats = ['5398465861', '05398465861', '+905398465861'];
  
  for (const format of formats) {
    const [users] = await conn.execute(
      'SELECT id, email, phone, firstName, lastName FROM users WHERE phone = ?',
      [format]
    );
    console.log(`Format: ${format} ->`, users);
  }
  
  // Tüm phone numaralarını göster
  const [allUsers] = await conn.execute(
    'SELECT id, email, phone FROM users WHERE phone LIKE "%539846%"'
  );
  console.log('📱 539846 içeren tüm numaralar:', allUsers);
  
  await conn.end();
}

checkPhone().catch(console.error);