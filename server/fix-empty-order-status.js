import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fixOrderStatus() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔍 Boş status olan siparişleri kontrol ediyorum...');
    
    // Boş status olan siparişi bul
    const [orders] = await connection.execute(
      `SELECT id, status, completed_at, delivered_at, shipped_at, started_processing_at 
       FROM orders 
       WHERE status = '' OR status IS NULL`
    );
    
    console.log('❌ Boş status olan siparişler:', orders);
    
    for (const order of orders) {
      let newStatus = 'pending';
      
      // Tarihlere göre uygun status belirle
      if (order.completed_at) {
        newStatus = 'completed';
      } else if (order.delivered_at) {
        newStatus = 'delivered';
      } else if (order.shipped_at) {
        newStatus = 'shipped';
      } else if (order.started_processing_at) {
        newStatus = 'preparing';
      }
      
      console.log(`🔧 Sipariş ${order.id} durumu '${order.status}' -> '${newStatus}' olarak güncelleniyor...`);
      
      await connection.execute(
        'UPDATE orders SET status = ? WHERE id = ?',
        [newStatus, order.id]
      );
    }
    
    console.log('✅ Tüm sipariş durumları güncellendi');
    
    // Güncellenmiş durumu kontrol et
    if (orders.length > 0) {
      const placeholders = orders.map(() => '?').join(',');
      const [updatedOrders] = await connection.execute(
        `SELECT id, status, total_amount FROM orders WHERE id IN (${placeholders})`,
        orders.map(o => o.id)
      );
      
      console.log('📋 Güncellenmiş siparişler:', updatedOrders);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

fixOrderStatus();