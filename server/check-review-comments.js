// Check review comments in database
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkReviewComments() {
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
    
    // Bu kullanıcının tüm değerlendirmelerini yorumları ile birlikte listele
    const [reviews] = await connection.execute(`
      SELECT 
        ur.id,
        ur.order_id,
        ur.reviewer_id,
        ur.reviewee_id,
        ur.rating,
        ur.comment,
        ur.created_at,
        ur.updated_at,
        os.seller_name,
        os.seller_email,
        o.total_amount as order_total
      FROM user_reviews ur
      LEFT JOIN order_sellers os ON ur.order_id = os.order_id AND ur.reviewee_id = os.seller_id
      LEFT JOIN orders o ON ur.order_id = o.id
      WHERE ur.reviewer_id = ?
      ORDER BY ur.created_at DESC
    `, [userId]);

    console.log(`\n📝 All reviews by user (${reviews.length} found):`);
    
    reviews.forEach((review, index) => {
      console.log(`\n--- Review ${index + 1} ---`);
      console.log(`📦 Order ID: ${review.order_id}`);
      console.log(`👨‍💼 Seller: ${review.seller_name} (${review.reviewee_id})`);
      console.log(`⭐ Rating: ${review.rating}/5`);
      console.log(`💬 Comment: "${review.comment}"`);
      console.log(`📅 Date: ${review.created_at}`);
      console.log(`💰 Order Total: ₺${review.order_total}`);
    });
    
    // user_reviews tablosunun yapısını da görelim
    const [tableStructure] = await connection.execute(`
      DESCRIBE user_reviews
    `);
    
    console.log(`\n🏗️ user_reviews table structure:`);
    console.table(tableStructure);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkReviewComments();