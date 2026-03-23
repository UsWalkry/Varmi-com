const mysql = require('mysql2/promise');

async function checkImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varmi_db'
  });

  const [rows] = await connection.execute(`
    SELECT COUNT(*) as total_offers, 
           SUM(CASE WHEN images IS NOT NULL THEN 1 ELSE 0 END) as offers_with_images,
           SUM(CASE WHEN images IS NULL THEN 1 ELSE 0 END) as offers_without_images
    FROM offers 
  `);

  console.log('📊 Offers tablosu durumu:');
  console.table(rows[0]);

  // Son 5 teklifi göster
  const [allOffers] = await connection.execute(`
    SELECT id, listing_id, price, quantity, images, created_at 
    FROM offers 
    ORDER BY created_at DESC 
    LIMIT 5
  `);

  console.log('\n� Son 5 teklif:');
  allOffers.forEach((row, i) => {
    console.log(`\n${i+1}. ID: ${row.id}`);
    console.log(`   Listing: ${row.listing_id}`);
    console.log(`   Price: ${row.price}`);
    console.log(`   Quantity: ${row.quantity}`);
    console.log(`   Images: ${row.images ? 'VAR' : 'YOK'}`);
    console.log(`   Created: ${row.created_at}`);
  });

  await connection.end();
}

checkImages().catch(console.error);