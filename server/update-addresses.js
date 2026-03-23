const mysql = require('mysql2/promise');

async function updateShippingAddresses() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'varmi_marketplace'
    });
    
    const sampleAddress = 'İstanbul, Kadıköy, Moda Mahallesi, Bahariye Caddesi No:123, Daire:5, 34710';
    
    const result = await connection.execute(
      'UPDATE orders SET shipping_address = ? WHERE shipping_address IS NULL OR shipping_address = ""',
      [sampleAddress]
    );
    
    console.log('✅ Updated shipping addresses for', result[0].affectedRows, 'orders');
    
    // Show updated orders
    const [orders] = await connection.execute(
      'SELECT id, order_number, shipping_address FROM orders LIMIT 5'
    );
    
    console.log('📦 Sample orders:', orders);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error updating addresses:', error);
  }
}

updateShippingAddresses();