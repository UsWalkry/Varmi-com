// Simple test to check database data
import mysql from 'mysql2/promise';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'varmi_db',
  port: 3307
});

async function checkData() {
  try {
    const conn = await connection;
    
    console.log('📋 Checking users...');
    const [users] = await conn.execute('SELECT id, email FROM users LIMIT 3');
    console.log('Users:', users);
    
    console.log('\n📋 Checking orders...');
    const [orders] = await conn.execute('SELECT id, user_id, status, total_amount FROM orders LIMIT 3');
    console.log('Orders:', orders);
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();