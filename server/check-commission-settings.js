import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db'
};

async function checkSettings() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database\n');
    
    console.log('📊 Current commission settings:');
    console.log('─'.repeat(80));
    
    const [rows] = await connection.query(`
      SELECT * FROM site_settings 
      WHERE setting_key LIKE 'commission%' 
      ORDER BY setting_key
    `);
    
    console.table(rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkSettings();
