// Simple SQL insert for sample orders
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function createSampleOrders() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'varmi_db',
    port: parseInt(process.env.DB_PORT || '3306'),
    charset: 'utf8mb4'
  });

  try {
    console.log('🔗 Connected to MySQL database');
    
    const userId = '7cfaf015-b614-43b0-9774-9cc1cddd3efc'; // Burak Rüştü Aydın
    console.log('👤 Creating orders for user:', userId);

    // Insert sample orders
    await connection.execute(`
      INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, tracking_number, estimated_delivery) VALUES
      (?, ?, 'shipped', 2339.98, 15.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', 'PT123456789', '2025-01-25')
    `, ['order-current-1', userId]);

    await connection.execute(`
      INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, estimated_delivery) VALUES
      (?, ?, 'preparing', 599.99, 9.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', '2025-01-22')
    `, ['order-current-2', userId]);

    await connection.execute(`
      INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, tracking_number, estimated_delivery) VALUES
      (?, ?, 'delivered', 1249.97, 12.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', 'YK555444333', '2025-01-19')
    `, ['order-current-3', userId]);

    console.log('✅ Orders created successfully');

    // Insert order items
    await connection.execute(`
      INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
      (?, 'listing-1', 'Trina Profesyonel Tırnak Törpü Makinesi', 'Profesyonel salon kalitesinde tırnak törpü makinesi', 1589.99, 1, '/uploads/1759945986971-520998012.jpg')
    `, ['order-current-1']);

    await connection.execute(`
      INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
      (?, 'listing-2', 'Salon Kalitesi Tırnak Bakım Seti', 'Komple tırnak bakım seti', 749.99, 1, '/uploads/1759945986971-520998012.jpg')
    `, ['order-current-1']);

    await connection.execute(`
      INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
      (?, 'listing-3', 'Profesyonel Saç Kurutma Makinesi', 'Yüksek güçlü profesyonel saç kurutma makinesi', 599.99, 1, '/uploads/1759945986971-520998012.jpg')
    `, ['order-current-2']);

    console.log('✅ Order items created successfully');

    // Insert order sellers (make user both buyer and seller for testing)
    await connection.execute(`
      INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
      (?, ?, 'Burak Rüştü Aydın (Test)', 'bybrkaydn@gmail.com')
    `, ['order-current-1', userId]);

    await connection.execute(`
      INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
      (?, ?, 'Burak Rüştü Aydın (Test)', 'bybrkaydn@gmail.com')
    `, ['order-current-2', userId]);

    await connection.execute(`
      INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
      (?, ?, 'Burak Rüştü Aydın (Test)', 'bybrkaydn@gmail.com')
    `, ['order-current-3', userId]);

    console.log('✅ Order sellers created successfully');

    // Insert tracking data
    await connection.execute(`
      INSERT IGNORE INTO order_tracking (order_id, status, description) VALUES
      (?, 'Sipariş Alındı', 'Siparişiniz başarıyla alındı ve işleme konuldu')
    `, ['order-current-1']);

    await connection.execute(`
      INSERT IGNORE INTO order_tracking (order_id, status, description) VALUES
      (?, 'Kargoya Verildi', 'Siparişiniz PTT Kargoya teslim edildi')
    `, ['order-current-1']);

    console.log('✅ Order tracking created successfully');

    // Check results
    const [orders] = await connection.execute(`
      SELECT o.*, COUNT(oi.id) as item_count 
      FROM orders o 
      LEFT JOIN order_items oi ON o.id = oi.order_id 
      WHERE o.user_id = ? 
      GROUP BY o.id
    `, [userId]);

    console.log('📦 Final orders for user:');
    console.table(orders);

    console.log('🎉 Sample orders setup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

createSampleOrders();