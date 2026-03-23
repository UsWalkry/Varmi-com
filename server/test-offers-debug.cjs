const mysql = require('mysql2/promise');
const dbConfig = { host: 'localhost', user: 'root', password: '', database: 'varmi_db', port: 3307 };

async function testOffers() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Test specific listing that should have offers
    const listingId = 'ba5dad8c-fd01-4c75-b4d3-1ce210c8f583';
    
    const [offers] = await connection.execute(`
      SELECT 
        o.*,
        CONCAT(u.firstName, ' ', u.lastName) as seller_name,
        u.email_verified as seller_email_verified
      FROM offers o
      JOIN users u ON o.seller_id = u.id
      WHERE o.listing_id = ?
      ORDER BY o.created_at DESC
    `, [listingId]);
    
    console.log(`Offers for listing ${listingId}:`);
    console.log('Total count:', offers.length);
    
    offers.forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.seller_name}`);
      console.log(`   Price: ${offer.price} TL`);
      console.log(`   Status: ${offer.status}`);
      console.log(`   Email verified: ${offer.seller_email_verified}`);
      console.log('');
    });
    
    await connection.end();
  } catch (error) {
    console.error('Database error:', error.message);
  }
}

testOffers();