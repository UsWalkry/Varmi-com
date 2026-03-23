const mysql = require('mysql2/promise');

async function checkOrdersTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'varmi_db',
      port: 3307
    });
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE orders');
    console.log('📋 Orders table columns:', columns);
    
    // Show sample data
    const [orders] = await connection.execute('SELECT * FROM orders LIMIT 3');
    console.log('📦 Sample orders:', orders);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOrdersTable();