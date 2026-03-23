// Check existing reviews by reviewer and reviewee
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkReviewsByUser() {
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
    
    // Show reviews grouped by reviewer and reviewee
    const [reviewPairs] = await connection.execute(`
      SELECT 
        reviewer_id,
        reviewee_id,
        COUNT(*) as review_count,
        GROUP_CONCAT(order_id) as order_ids,
        MIN(created_at) as first_review,
        MAX(created_at) as last_review
      FROM user_reviews 
      GROUP BY reviewer_id, reviewee_id
      ORDER BY review_count DESC, first_review DESC
    `);

    console.log(`📊 Reviews by reviewer-reviewee pairs (${reviewPairs.length} pairs):`);
    console.table(reviewPairs);

    // Check for multiple reviews from same reviewer to same reviewee
    const [multipleReviews] = await connection.execute(`
      SELECT 
        reviewer_id,
        reviewee_id,
        COUNT(*) as review_count,
        GROUP_CONCAT(order_id) as order_ids
      FROM user_reviews 
      GROUP BY reviewer_id, reviewee_id
      HAVING COUNT(*) > 1
    `);

    console.log(`🚨 Multiple reviews from same reviewer to same reviewee (${multipleReviews.length} cases):`);
    if (multipleReviews.length > 0) {
      console.table(multipleReviews);
    } else {
      console.log('✅ No multiple reviews found (good!)');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkReviewsByUser();