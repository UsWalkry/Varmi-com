const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'varmi_db',
  port: 3306,
  connectTimeout: 60000
};

async function testConnection() {
  try {
    console.log('Testing MySQL connection...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!');
    
    const [rows] = await connection.query('SHOW TABLES');
    console.log('\n📋 Tables in database:');
    console.table(rows);
    
    await connection.end();
    console.log('\n✅ Connection closed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
