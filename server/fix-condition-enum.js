// Fix listing_condition ENUM to include 'any' value
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixConditionEnum() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Add 'any' to listing_condition ENUM
    await conn.execute(`
      ALTER TABLE listings 
      MODIFY COLUMN listing_condition ENUM('new','like_new','good','fair','poor','any') DEFAULT 'any'
    `);
    console.log('✅ listing_condition ENUM updated to include "any" value');

    // Update existing listings that should be 'any' but were stored as 'good'
    // (This is optional - only run if you know specific listings should be 'any')
    
    // Verify the change
    const [columns] = await conn.execute("DESCRIBE listings");
    const conditionCol = columns.find(c => c.Field === 'listing_condition');
    console.log('📋 Updated column:', conditionCol);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await conn.end();
  }
}

fixConditionEnum();
