import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function checkComment() {
  try {
    const [rows] = await pool.execute(
      `SELECT id, comment, is_visible, is_owner_reply, parent_comment_id, user_id, created_at
       FROM listing_comments 
       WHERE comment LIKE '%200 tl%' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (rows.length > 0) {
      console.log('Comment found:');
      console.log(JSON.stringify(rows[0], null, 2));
      console.log('\nStatus:');
      console.log('  is_visible:', rows[0].is_visible ? 'YES ✅' : 'NO ❌ (PENDING)');
      console.log('  is_owner_reply:', rows[0].is_owner_reply ? 'YES (owner replied)' : 'NO (user comment)');
      console.log('  parent_comment_id:', rows[0].parent_comment_id || 'NULL (root comment)');
    } else {
      console.log('No comment found with "200 tl"');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkComment();
