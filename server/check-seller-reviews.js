// Check reviews for this seller and user
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkSellerReviews() {
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
    
    const userId = '415b0c17-c2bd-40a5-ac3d-158578ff1df1'; // Burak AYDIN
    const newOrderId = '576090c8-f3d3-497f-9204-12484d0054ab'; // Yeni sipariş (Yunus KAYA)
    
    console.log('🔍 Checking new order seller:');
    console.log('👤 User ID:', userId);
    console.log('� New Order ID:', newOrderId);
    
    // Yeni siparişin satıcısını bul
    const [newOrderSellers] = await connection.execute(`
      SELECT * FROM order_sellers WHERE order_id = ?
    `, [newOrderId]);
    
    console.log(`\n📦 New order sellers:`);
    console.table(newOrderSellers);
    
    if (newOrderSellers.length === 0) {
      console.log('❌ No sellers found for this order!');
      await connection.end();
      return;
    }
    
    const newSellerId = newOrderSellers[0].seller_id;
    const newSellerName = newOrderSellers[0].seller_name;
    
    console.log(`\n🔍 New seller: ${newSellerName} (${newSellerId})`);
    
    // Bu kullanıcının bu yeni satıcıya ait değerlendirmelerini bul
    const [newSellerReviews] = await connection.execute(`
      SELECT 
        ur.*,
        os.seller_name,
        o.id as order_id,
        o.created_at as order_date
      FROM user_reviews ur
      LEFT JOIN order_sellers os ON ur.order_id = os.order_id AND ur.reviewee_id = os.seller_id
      LEFT JOIN orders o ON ur.order_id = o.id
      WHERE ur.reviewer_id = ? AND ur.reviewee_id = ?
      ORDER BY ur.created_at DESC
    `, [userId, newSellerId]);

    console.log(`\n📝 Reviews for new seller ${newSellerName} (${newSellerId}):`);
    console.table(newSellerReviews);
    
    // checkIfReviewRequired mantığını simüle et
    const reviewCount = newSellerReviews.length;
    const requiresReview = reviewCount === 0;
    
    console.log(`\n🧮 Review logic simulation for new seller:`);
    console.log('📊 Review count for this seller:', reviewCount);
    console.log('✅ Should require review:', requiresReview);
    
    if (reviewCount > 0) {
      console.log('🚫 No review required because user already reviewed this seller');
      console.log('📋 Previous reviews:');
      newSellerReviews.forEach(review => {
        console.log(`- Order ${review.order_id}: Rating ${review.rating} on ${review.created_at}`);
      });
    } else {
      console.log('✅ Review required because user never reviewed this seller');
    }
    
    // Yeni siparişin durumunu da kontrol et
    const [newOrder] = await connection.execute(`
      SELECT * FROM orders WHERE id = ?
    `, [newOrderId]);
    
    console.log(`\n📦 New order details:`);
    console.table(newOrder);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSellerReviews();