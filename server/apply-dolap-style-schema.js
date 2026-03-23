import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varmi_db',
  port: parseInt(process.env.DB_PORT || '3307'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function applyDolapStyleSchema() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Starting Dolap-style comment schema migration...\n');

    // Step 1: Add visibility_state enum column
    console.log('📝 Step 1: Adding visibility_state column...');
    await connection.execute(`
      ALTER TABLE listing_comments 
      ADD COLUMN visibility_state ENUM('PRIVATE_UNTIL_SELLER_REPLY', 'PUBLIC_AFTER_SELLER_REPLY') 
      DEFAULT 'PRIVATE_UNTIL_SELLER_REPLY' 
      AFTER is_visible
    `);
    console.log('✅ visibility_state column added\n');

    // Step 2: Add is_first_seller_reply_exists flag
    console.log('📝 Step 2: Adding is_first_seller_reply_exists column...');
    await connection.execute(`
      ALTER TABLE listing_comments 
      ADD COLUMN is_first_seller_reply_exists BOOLEAN 
      DEFAULT FALSE 
      AFTER visibility_state
    `);
    console.log('✅ is_first_seller_reply_exists column added\n');

    // Step 3: Update existing data
    console.log('📝 Step 3: Migrating existing visible comments to PUBLIC state...');
    const [updateResult] = await connection.execute(`
      UPDATE listing_comments 
      SET visibility_state = 'PUBLIC_AFTER_SELLER_REPLY',
          is_first_seller_reply_exists = TRUE
      WHERE is_visible = TRUE
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} existing comments\n`);

    // Step 4: Add indexes for performance
    console.log('📝 Step 4: Adding performance indexes...');
    await connection.execute(`
      CREATE INDEX idx_listing_comments_visibility 
      ON listing_comments(visibility_state, listing_id)
    `);
    console.log('✅ Index idx_listing_comments_visibility created');

    await connection.execute(`
      CREATE INDEX idx_listing_comments_listing_owner 
      ON listing_comments(listing_id, user_id)
    `);
    console.log('✅ Index idx_listing_comments_listing_owner created\n');

    // Step 5: Verification
    console.log('📊 Step 5: Verifying migration...');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_comments,
        SUM(CASE WHEN visibility_state = 'PRIVATE_UNTIL_SELLER_REPLY' THEN 1 ELSE 0 END) as private_comments,
        SUM(CASE WHEN visibility_state = 'PUBLIC_AFTER_SELLER_REPLY' THEN 1 ELSE 0 END) as public_comments,
        SUM(CASE WHEN is_first_seller_reply_exists = TRUE THEN 1 ELSE 0 END) as seller_replied
      FROM listing_comments
    `);

    console.log('\n📈 Migration Statistics:');
    console.log('═══════════════════════════════════════');
    console.log(`Total comments: ${stats[0].total_comments}`);
    console.log(`PRIVATE (awaiting seller reply): ${stats[0].private_comments}`);
    console.log(`PUBLIC (seller replied): ${stats[0].public_comments}`);
    console.log(`Comments with seller reply: ${stats[0].seller_replied}`);
    console.log('═══════════════════════════════════════\n');

    console.log('✅ Dolap-style comment system migration completed successfully! 🎉');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('\n⚠️  Columns already exist. Running verification instead...\n');
      
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_comments,
          SUM(CASE WHEN visibility_state = 'PRIVATE_UNTIL_SELLER_REPLY' THEN 1 ELSE 0 END) as private_comments,
          SUM(CASE WHEN visibility_state = 'PUBLIC_AFTER_SELLER_REPLY' THEN 1 ELSE 0 END) as public_comments,
          SUM(CASE WHEN is_first_seller_reply_exists = TRUE THEN 1 ELSE 0 END) as seller_replied
        FROM listing_comments
      `);

      console.log('📈 Current Statistics:');
      console.log('═══════════════════════════════════════');
      console.log(`Total comments: ${stats[0].total_comments}`);
      console.log(`PRIVATE (awaiting seller reply): ${stats[0].private_comments}`);
      console.log(`PUBLIC (seller replied): ${stats[0].public_comments}`);
      console.log(`Comments with seller reply: ${stats[0].seller_replied}`);
      console.log('═══════════════════════════════════════');
    } else {
      throw error;
    }
  } finally {
    connection.release();
    await pool.end();
  }
}

applyDolapStyleSchema();
