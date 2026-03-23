import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function testComments() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      charset: 'utf8mb4'
    });

    console.log('✅ Connected to MySQL database\n');

    // Test query
    const testListingId = 'b4494b18-8090-42fe-ac96-f80774e26fb7';
    
    console.log('📝 Testing comment query for listing:', testListingId);
    
    const [comments] = await connection.query(
      `SELECT 
        lc.*,
        u.firstName,
        u.lastName,
        CONCAT(u.firstName, ' ', u.lastName) as userName
      FROM listing_comments lc
      JOIN users u ON lc.user_id = u.id
      WHERE lc.listing_id = ? AND lc.is_visible = TRUE
      ORDER BY lc.created_at ASC`,
      [testListingId]
    );

    console.log('💬 Comments found:', Array.isArray(comments) ? comments.length : 0);
    console.log('📋 Comments:', comments);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testComments();
