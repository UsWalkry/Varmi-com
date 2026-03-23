// Update the Kiwi Isıtıcı listing condition to 'any' and delivery_type to 'both'
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateListing() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await conn.execute(
      "UPDATE listings SET listing_condition = 'any', delivery_type = 'both' WHERE id = '7a6e7ce3-8941-48c4-a6bc-9db0e173332a'"
    );
    console.log('✅ Kiwi Isıtıcı ilanı güncellendi: listing_condition = any, delivery_type = both');

    const [rows] = await conn.execute(
      "SELECT id, title, listing_condition, delivery_type FROM listings WHERE id = '7a6e7ce3-8941-48c4-a6bc-9db0e173332a'"
    );
    console.log('📋 Güncellenmiş ilan:', rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await conn.end();
  }
}

updateListing();
