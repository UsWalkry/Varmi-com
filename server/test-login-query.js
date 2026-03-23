import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testLoginQuery() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'varmi_db',
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  });

  console.log('🧪 Login sorgusu testi - 5398465861 girişi');
  
  // Aynı login mantığını kullan
  const email = '5398465861';
  const cleanInput = email.replace(/\s/g, '');
  
  const phoneFormats = [];
  if (/^[5]\d{9}$/.test(cleanInput)) {
    phoneFormats.push(cleanInput, '0' + cleanInput, '+90' + cleanInput);
  } else if (/^0[5]\d{9}$/.test(cleanInput)) {
    phoneFormats.push(cleanInput, cleanInput.substring(1), '+90' + cleanInput.substring(1));
  } else if (/^\+90[5]\d{9}$/.test(cleanInput)) {
    phoneFormats.push(cleanInput, cleanInput.substring(3), '0' + cleanInput.substring(3));
  }
  
  console.log('📱 Aranacak formatlar:', phoneFormats);
  
  let sqlQuery = `SELECT id, email, phone, firstName, lastName FROM users WHERE email = ?`;
  let queryParams = [email];
  
  for (const phoneFormat of phoneFormats) {
    sqlQuery += ' OR phone = ?';
    queryParams.push(phoneFormat);
  }
  
  console.log('🔍 SQL:', sqlQuery);
  console.log('📋 Parametreler:', queryParams);
  
  const [users] = await conn.execute(sqlQuery, queryParams);
  console.log('✅ Sonuç:', users);
  
  await conn.end();
}

testLoginQuery().catch(console.error);