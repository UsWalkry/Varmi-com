// Test script to check listings endpoint and database
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load .env
dotenv.config({ path: './.env' });

async function testDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'varmi_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  };

  console.log('📋 Testing database connection with config:');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('\n✅ Connected to database!');

    // Check if listings table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings'",
      [dbConfig.database]
    );

    if (tables.length === 0) {
      console.log('\n❌ listings table does NOT exist!');
      connection.end();
      return;
    }

    console.log('\n✅ listings table exists');

    // Check columns
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings'",
      [dbConfig.database]
    );

    console.log('\n📊 Listings table columns:');
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.COLUMN_NAME}`);
    });

    // Check if approval_status column exists
    const hasApprovalStatus = columns.some(col => col.COLUMN_NAME === 'approval_status');
    console.log(`\n✓ approval_status column exists: ${hasApprovalStatus ? '✅ YES' : '❌ NO'}`);

    // Get row count
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`\n📈 Total listings in database: ${countResult[0].count}`);

    // Get active & approved listings
    const [activeResult] = await connection.execute(
      "SELECT COUNT(*) as count FROM listings WHERE status = 'active' AND approval_status = 'approved'"
    );
    console.log(`✓ Active & Approved listings: ${activeResult[0].count}`);

    // Try the actual query
    console.log('\n🔍 Testing actual query...');
    const [listings] = await connection.execute(`
      SELECT 
        l.id,
        l.title,
        l.status,
        l.approval_status,
        u.firstName
      FROM listings l
      JOIN users u ON l.buyer_id = u.id
      WHERE l.status = 'active' AND l.approval_status = 'approved'
      LIMIT 5
    `);

    console.log(`\n✅ Query successful! Found ${listings.length} listings`);
    if (listings.length > 0) {
      console.log('\nSample listing:');
      console.log(JSON.stringify(listings[0], null, 2));
    }

    connection.end();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ER_UNKNOWN_COLUMN') {
      console.log('\n⚠️  Column not found - approval_status may not exist in the table');
      console.log('   Run: add_listing_approval_system.sql');
    }
  }
}

testDatabase();
