import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'varmi_db'
});

const listingId = 'b4494b18-8090-42fe-ac96-f80774e26fb7';
const parentCommentId = 'e2b291e5-a11c-4b01-936a-9aebda5842a3';

console.log('\n🔍 Checking nested comments...\n');

try {
  const [results] = await conn.execute(
    `SELECT id, comment, is_visible, is_owner_reply, user_id, created_at 
     FROM listing_comments 
     WHERE listing_id = ? AND parent_comment_id = ? 
     ORDER BY created_at`,
    [listingId, parentCommentId]
  );

  console.log(`Found ${results.length} nested replies:\n`);
  
  results.forEach((row, idx) => {
    const status = row.is_visible ? '✅ VISIBLE' : '⏳ PENDING';
    const type = row.is_owner_reply ? '(Owner)' : '(User)';
    console.log(`${idx + 1}. ${status} ${type}`);
    console.log(`   Comment: "${row.comment.substring(0, 50)}..."`);
    console.log(`   ID: ${row.id}`);
    console.log(`   Created: ${row.created_at}\n`);
  });
  
  const visibleUserComments = results.filter(r => r.is_visible && !r.is_owner_reply);
  if (visibleUserComments.length > 0) {
    console.log('❌ PROBLEM: These user comments are visible but should be pending:');
    visibleUserComments.forEach(c => {
      console.log(`   - "${c.comment}" (ID: ${c.id})`);
    });
  } else {
    console.log('✅ All user comments are correctly pending!');
  }
  
  await conn.end();
  process.exit(0);
} catch (error) {
  console.error('Error:', error);
  await conn.end();
  process.exit(1);
}
