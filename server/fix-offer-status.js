// Fix offer status for orders that have been paid
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fixOfferStatus() {
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
    
    // Find offers that have orders but wrong status
    const [mismatchedOffers] = await connection.execute(`
      SELECT 
        o.id as offer_id,
        o.status as current_status,
        o.accepted_at,
        ord.created_at as order_created_at
      FROM offers o
      INNER JOIN order_items oi ON o.id = oi.offer_id
      INNER JOIN orders ord ON oi.order_id = ord.id
      WHERE o.status != 'accepted' OR o.accepted_at IS NULL
    `);

    console.log(`🔧 Fixing ${mismatchedOffers.length} mismatched offers...`);

    if (mismatchedOffers.length > 0) {
      // Update each offer
      for (const offer of mismatchedOffers) {
        console.log(`📝 Updating offer ${offer.offer_id}:`);
        console.log(`   Current status: ${offer.current_status} → accepted`);
        console.log(`   Setting accepted_at: ${offer.order_created_at}`);

        await connection.execute(`
          UPDATE offers 
          SET status = 'accepted', 
              accepted_at = ?
          WHERE id = ?
        `, [offer.order_created_at, offer.offer_id]);

        console.log(`✅ Updated offer ${offer.offer_id}`);
      }

      console.log(`🎉 Fixed ${mismatchedOffers.length} offers!`);
    } else {
      console.log('✅ No offers need fixing');
    }

    // Verify the fix
    const [verifyOffers] = await connection.execute(`
      SELECT 
        o.id as offer_id,
        o.status,
        o.accepted_at,
        l.title
      FROM offers o
      INNER JOIN order_items oi ON o.id = oi.offer_id
      INNER JOIN orders ord ON oi.order_id = ord.id
      LEFT JOIN listings l ON o.listing_id = l.id
      ORDER BY o.updated_at DESC
    `);

    console.log(`📊 Updated offers status:`);
    console.table(verifyOffers);

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixOfferStatus();