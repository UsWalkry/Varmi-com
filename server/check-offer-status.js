// Check offer status and order relationship
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkOfferStatus() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db',
      port: parseInt(process.env.DB_PORT || '3306'),
      charset: 'utf8mb4'
    });

    console.log('🔗 Connected to MySQL database');
    
    // Check recent offers and their statuses
    const [offers] = await connection.execute(`
      SELECT 
        o.id as offer_id,
        o.listing_id,
        o.seller_id,
        o.price,
        o.status as offer_status,
        o.accepted_at,
        l.title as listing_title,
        ord.id as order_id,
        ord.status as order_status,
        ord.payment_status
      FROM offers o
      LEFT JOIN listings l ON o.listing_id = l.id
      LEFT JOIN order_items oi ON o.id = oi.offer_id
      LEFT JOIN orders ord ON oi.order_id = ord.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    console.log(`📊 Recent offers and their order status (${offers.length} found):`);
    console.table(offers);

    // Check for offers that have orders but wrong status
    const [mismatchedOffers] = await connection.execute(`
      SELECT 
        o.id as offer_id,
        o.status as offer_status,
        o.accepted_at,
        ord.id as order_id,
        ord.status as order_status,
        ord.payment_status,
        l.title
      FROM offers o
      INNER JOIN order_items oi ON o.id = oi.offer_id
      INNER JOIN orders ord ON oi.order_id = ord.id
      LEFT JOIN listings l ON o.listing_id = l.id
      WHERE o.status != 'accepted' OR o.accepted_at IS NULL
    `);

    console.log(`🚨 Mismatched offers (have orders but wrong status - ${mismatchedOffers.length} found):`);
    if (mismatchedOffers.length > 0) {
      console.table(mismatchedOffers);
    } else {
      console.log('✅ No mismatched offers found');
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkOfferStatus();