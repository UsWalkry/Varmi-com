// Check user_reviews table
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkReviews() {
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
    
    // Check if user_reviews table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'user_reviews'
    `);
    
    console.log('📋 user_reviews table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      // Show table structure
      const [structure] = await connection.execute('DESCRIBE user_reviews');
      console.log('🏗️ Table structure:');
      console.table(structure);
      
      // Show all reviews
      const [reviews] = await connection.execute('SELECT * FROM user_reviews ORDER BY created_at DESC LIMIT 10');
      console.log(`📝 Recent reviews (${reviews.length} found):`);
      if (reviews.length > 0) {
        console.table(reviews);
      } else {
        console.log('✅ No reviews found in database yet');
      }
      
      // Show count by order
      const [counts] = await connection.execute('SELECT order_id, COUNT(*) as review_count FROM user_reviews GROUP BY order_id');
      console.log(`📊 Reviews by order (${counts.length} orders have reviews):`);
      if (counts.length > 0) {
        console.table(counts);
      }
    } else {
      console.log('❌ user_reviews table does not exist');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkReviews();