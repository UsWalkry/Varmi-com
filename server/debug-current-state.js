// Debug current orders and reviews
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function debugOrdersAndReviews() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔗 Connected to MySQL database');
    
    // Burak AYDIN'in kullanıcı ID'sini bul
    const userId = '415b0c17-c2bd-40a5-ac3d-158578ff1df1';
    console.log('👤 User ID:', userId);
    
    // Bu kullanıcının siparişlerini listele
    const [orders] = await connection.execute(`
      SELECT 
        o.id,
        o.status,
        o.completed_at,
        o.delivered_at,
        o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);

    console.log(`📦 User orders (${orders.length} found):`);
    console.table(orders);

    // Her sipariş için satıcıları listele
    for (const order of orders) {
      console.log(`\n🔍 Order ${order.id} sellers:`);
      
      const [sellers] = await connection.execute(`
        SELECT 
          seller_id,
          seller_name
        FROM order_sellers
        WHERE order_id = ?
      `, [order.id]);
      
      console.table(sellers);
    }

    // Bu kullanıcının tüm değerlendirmelerini listele
    const [reviews] = await connection.execute(`
      SELECT 
        ur.*,
        os.seller_name
      FROM user_reviews ur
      LEFT JOIN order_sellers os ON ur.order_id = os.order_id AND ur.reviewee_id = os.seller_id
      WHERE ur.reviewer_id = ?
      ORDER BY ur.created_at DESC
    `, [userId]);

    console.log(`\n📝 User reviews (${reviews.length} found):`);
    console.table(reviews);

    // Satıcı bazında kontrol
    const [sellerReviews] = await connection.execute(`
      SELECT 
        reviewee_id,
        COUNT(*) as review_count,
        GROUP_CONCAT(order_id) as order_ids
      FROM user_reviews
      WHERE reviewer_id = ?
      GROUP BY reviewee_id
    `, [userId]);

    console.log(`\n👥 Reviews by seller (${sellerReviews.length} sellers reviewed):`);
    console.table(sellerReviews);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugOrdersAndReviews();