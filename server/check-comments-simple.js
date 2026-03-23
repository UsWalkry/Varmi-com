import { query } from './src/database.js';

async function checkComments() {
  try {
    console.log('✅ Checking comments in database...\n');

    // Check all comments
    const allCommentsResult = await query(`
      SELECT 
        lc.id,
        lc.listing_id,
        lc.comment,
        lc.is_visible,
        lc.is_owner_reply,
        lc.parent_comment_id,
        lc.created_at,
        u.firstName,
        u.lastName,
        u.email
      FROM listing_comments lc
      JOIN users u ON lc.user_id = u.id
      ORDER BY lc.created_at DESC
      LIMIT 10
    `);

    const allComments = allCommentsResult[0];

    console.log('📝 Latest 10 Comments:');
    console.log('='.repeat(100));
    
    if (Array.isArray(allComments) && allComments.length > 0) {
      allComments.forEach((comment, idx) => {
        console.log(`\n${idx + 1}. Comment ID: ${comment.id}`);
        console.log(`   Listing: ${comment.listing_id}`);
        console.log(`   User: ${comment.firstName} ${comment.lastName} (${comment.email})`);
        console.log(`   Comment: ${comment.comment.substring(0, 80)}${comment.comment.length > 80 ? '...' : ''}`);
        console.log(`   Visible: ${comment.is_visible ? '✅ YES' : '❌ NO (pending)'}`);
        console.log(`   Owner Reply: ${comment.is_owner_reply ? 'YES' : 'NO'}`);
        console.log(`   Parent ID: ${comment.parent_comment_id || 'None (root comment)'}`);
        console.log(`   Created: ${comment.created_at}`);
      });
    } else {
      console.log('   No comments found!');
    }

    // Check pending comments count
    const pendingCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM listing_comments 
      WHERE is_visible = FALSE AND parent_comment_id IS NULL
    `);
    const pendingCount = pendingCountResult[0][0];

    console.log('\n\n⏳ Total Pending Comments (root only):', pendingCount.count);

    // Check visible comments count
    const visibleCountResult = await query(`
      SELECT COUNT(*) as count 
      FROM listing_comments 
      WHERE is_visible = TRUE
    `);
    const visibleCount = visibleCountResult[0][0];

    console.log('👁️  Total Visible Comments:', visibleCount.count);

    // Check total
    const totalCountResult = await query(`
      SELECT COUNT(*) as count FROM listing_comments
    `);
    const totalCount = totalCountResult[0][0];

    console.log('📊 Total Comments:', totalCount.count);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkComments();
