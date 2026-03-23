import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  port: parseInt(process.env.DB_PORT || '3307'),
  charset: 'utf8mb4'
});

async function debugNestedReplies() {
  try {
    console.log('🔍 Debugging nested reply structure...\n');

    // Get all comments for the problematic listing
    const [comments] = await pool.execute(
      `SELECT 
        lc.id,
        lc.comment,
        lc.parent_comment_id,
        lc.is_owner_reply,
        lc.visibility_state,
        lc.is_visible,
        lc.created_at,
        CONCAT(u.firstName, ' ', u.lastName) as user_name
      FROM listing_comments lc
      JOIN users u ON lc.user_id = u.id
      WHERE lc.listing_id = 'b4494b18-8090-42fe-ac96-f80774e26fb7'
      ORDER BY lc.created_at ASC`
    );

    console.log(`Found ${comments.length} total comments\n`);

    // Build tree
    const commentMap = {};
    const rootComments = [];

    comments.forEach(c => {
      commentMap[c.id] = { ...c, children: [] };
    });

    comments.forEach(c => {
      if (c.parent_comment_id && commentMap[c.parent_comment_id]) {
        commentMap[c.parent_comment_id].children.push(commentMap[c.id]);
      } else if (!c.parent_comment_id) {
        rootComments.push(commentMap[c.id]);
      }
    });

    function printTree(comment, level = 0) {
      const indent = '  '.repeat(level);
      const ownerBadge = comment.is_owner_reply ? '👤 OWNER' : '👥 USER';
      const visibilityBadge = comment.visibility_state === 'PUBLIC_AFTER_SELLER_REPLY' ? '👁️ PUBLIC' : '🔒 PRIVATE';
      const visibleFlag = comment.is_visible ? '✅ VISIBLE' : '❌ HIDDEN';
      
      console.log(`${indent}${visibilityBadge} ${ownerBadge} ${visibleFlag}`);
      console.log(`${indent}[${comment.id.substring(0, 8)}...] "${comment.comment.substring(0, 50)}"`);
      console.log(`${indent}By: ${comment.user_name} | Created: ${comment.created_at.toISOString().substring(0, 19)}`);
      
      if (comment.children.length > 0) {
        console.log(`${indent}└─ ${comment.children.length} replies:\n`);
        comment.children.forEach(child => printTree(child, level + 1));
      }
      console.log('');
    }

    console.log('📊 Comment Tree Structure:\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    rootComments.forEach(comment => {
      printTree(comment);
      console.log('═══════════════════════════════════════════════════════════════\n');
    });

    // Check for orphaned comments
    const orphans = comments.filter(c => 
      c.parent_comment_id && !commentMap[c.parent_comment_id]
    );

    if (orphans.length > 0) {
      console.log('⚠️  WARNING: Found orphaned comments (parent not found):');
      orphans.forEach(o => {
        console.log(`  - ${o.id.substring(0, 8)}: "${o.comment.substring(0, 30)}" (parent: ${o.parent_comment_id?.substring(0, 8)})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugNestedReplies();
