import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env from server directory
dotenv.config();

async function checkComments() {
  console.log('🔧 Using DB config:', {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'varmi_db'
  });

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to database');

    // Check all comments
    const [allComments] = await connection.execute(`
      SELECT 
        lc.id,
        lc.listing_id,
        lc.comment,
        lc.is_visible,
        lc.is_owner_reply,
        lc.created_at,
        u.firstName,
        u.lastName,
        u.email
      FROM listing_comments lc
      JOIN users u ON lc.user_id = u.id
      ORDER BY lc.created_at DESC
      LIMIT 10
    `);

    console.log('\n📝 Latest 10 Comments:');
    console.log('='.repeat(100));
    allComments.forEach((comment, idx) => {
      console.log(`\n${idx + 1}. Comment ID: ${comment.id}`);
      console.log(`   Listing: ${comment.listing_id}`);
      console.log(`   User: ${comment.firstName} ${comment.lastName} (${comment.email})`);
      console.log(`   Comment: ${comment.comment.substring(0, 50)}...`);
      console.log(`   Visible: ${comment.is_visible ? '✅ YES' : '❌ NO (pending)'}`);
      console.log(`   Owner Reply: ${comment.is_owner_reply ? 'YES' : 'NO'}`);
      console.log(`   Created: ${comment.created_at}`);
    });

    // Check pending comments count
    const [pendingCount] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM listing_comments 
      WHERE is_visible = FALSE AND parent_comment_id IS NULL
    `);

    console.log('\n\n⏳ Total Pending Comments:', pendingCount[0].count);

    // Check visible comments count
    const [visibleCount] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM listing_comments 
      WHERE is_visible = TRUE
    `);

    console.log('👁️  Total Visible Comments:', visibleCount[0].count);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkComments();
