import fetch from 'node-fetch';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db',
  charset: 'utf8mb4'
};

async function testCommissionBalance() {
  console.log('🧪 Testing Commission Balance Endpoint\n');
  
  // 1. Database'den direkt kontrol
  const connection = await mysql.createConnection(dbConfig);
  const [users] = await connection.execute(
    'SELECT id, email, firstName, lastName, commission_balance, total_commission_earned FROM users WHERE email = ?',
    ['bybrkaydn@gmail.com']
  );
  
  if (users.length === 0) {
    console.log('❌ User not found');
    await connection.end();
    return;
  }
  
  const user = users[0];
  console.log('📊 Database Values:');
  console.log('  User:', user.firstName, user.lastName);
  console.log('  Email:', user.email);
  console.log('  Commission Balance:', user.commission_balance);
  console.log('  Total Earned:', user.total_commission_earned);
  console.log('');
  
  // 2. Token'ı al
  const [tokens] = await connection.execute(
    'SELECT token FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [user.id]
  );
  
  await connection.end();
  
  if (tokens.length === 0) {
    console.log('❌ No token found. Please login first.');
    return;
  }
  
  const token = tokens[0].token;
  console.log('🔑 Token:', token.substring(0, 30) + '...');
  console.log('');
  
  // 3. API endpoint'ini test et
  try {
    const response = await fetch('http://localhost:8787/api/commission/balance', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    console.log('📡 API Response:');
    console.log('  Status:', response.status);
    console.log('  Success:', data.success);
    console.log('  Balance:', data.balance);
    console.log('  Total Earned:', data.totalEarned);
    console.log('  Total Withdrawn:', data.totalWithdrawn);
    console.log('');
    
    // 4. Karşılaştır
    console.log('🔍 Comparison:');
    if (parseFloat(user.commission_balance) === parseFloat(data.balance)) {
      console.log('  ✅ Balance matches!');
    } else {
      console.log('  ❌ Balance MISMATCH!');
      console.log('     DB:', user.commission_balance);
      console.log('     API:', data.balance);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

testCommissionBalance();
