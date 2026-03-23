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

async function checkNestedReplyVisibility() {
  try {
    console.log('🔍 Checking nested comment structure for listing b4494b18-8090-42fe-ac96-f80774e26fb7...\n');

    const [comments] = await pool.execute(
      `SELECT 
        id, 
        user_id,
        comment, 
        parent_comment_id, 
        is_owner_reply, 
        is_visible,
        created_at,
        updated_at
      FROM listing_comments 
      WHERE listing_id = ?
      ORDER BY created_at ASC`,
      ['b4494b18-8090-42fe-ac96-f80774e26fb7']
    );

    console.log(`Found ${comments.length} total comments:\n`);

    // Build tree structure
    const commentMap = {};
    const rootComments = [];

    comments.forEach(c => {
      commentMap[c.id] = { ...c, children: [] };
    });

    comments.forEach(c => {
      if (c.parent_comment_id) {
        const parent = commentMap[c.parent_comment_id];
        if (parent) {
          parent.children.push(commentMap[c.id]);
        }
      } else {
        rootComments.push(commentMap[c.id]);
      }
    });

    function printTree(comment, level = 0) {
      const indent = '  '.repeat(level);
      const visibleStatus = comment.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
      const ownerStatus = comment.is_owner_reply ? '👤 OWNER' : '💬 USER';
      console.log(`${indent}${visibleStatus} ${ownerStatus} [${comment.id.substring(0, 8)}...] ${comment.comment.substring(0, 50)}`);
      console.log(`${indent}   Created: ${comment.created_at}`);
      
      if (comment.children.length > 0) {
        comment.children.forEach(child => printTree(child, level + 1));
      }
    }

    rootComments.forEach(comment => {
      console.log('\n📌 Root Comment:');
      printTree(comment);
    });

    console.log('\n\n🔍 Issue Analysis:');
    console.log('When owner replies to a nested comment (3rd level), the UPDATE query:');
    console.log('  UPDATE listing_comments SET is_visible = TRUE');
    console.log('  WHERE id = rootCommentId OR parent_comment_id = rootCommentId');
    console.log('\nThis only updates:');
    console.log('  1. The root comment itself');
    console.log('  2. Direct children of the root (2nd level)');
    console.log('\nBut it DOES NOT update:');
    console.log('  3. Grandchildren (3rd level)');
    console.log('  4. Owner\'s reply to 3rd level (4th level)\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkNestedReplyVisibility();
