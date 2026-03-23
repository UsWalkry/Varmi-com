import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function directCheck() {
  const connection = await mysql.createConnection(dbConfig);
  
  console.log('🔍 Direkt Veritabanı Kontrolü\n');
  
  const [users] = await connection.execute(
    `SELECT 
      id, 
      email, 
      firstName, 
      lastName, 
      commission_balance,
      total_commission_earned,
      total_commission_withdrawn
    FROM users 
    WHERE email = ?`,
    ['bybrkaydn@gmail.com']
  );
  
  if (users.length === 0) {
    console.log('❌ Kullanıcı bulunamadı');
    await connection.end();
    return;
  }
  
  const user = users[0];
  console.log('👤 Kullanıcı:', user.firstName, user.lastName);
  console.log('📧 Email:', user.email);
  console.log('💰 Commission Balance:', user.commission_balance, 'TL');
  console.log('📊 Total Earned:', user.total_commission_earned, 'TL');
  console.log('📤 Total Withdrawn:', user.total_commission_withdrawn || 0, 'TL');
  console.log('🆔 User ID:', user.id);
  
  await connection.end();
}

directCheck();
