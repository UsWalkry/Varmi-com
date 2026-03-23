const mysql = require('mysql2/promise');

async function checkImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varmi_db'
  });

  const [rows] = await connection.execute(`
    SELECT id, images, created_at 
    FROM offers 
    WHERE images IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 3
  `);

  console.log('📸 Son resimli teklifler:');
  rows.forEach((row, i) => {
    console.log(`\n${i+1}. Offer ID: ${row.id}`);
    console.log('Images type:', typeof row.images);
    console.log('Images length:', row.images?.length);
    console.log('Images preview:', row.images?.substring(0, 200));
    console.log('Created:', row.created_at);
  });

  await connection.end();
}

checkImages().catch(console.error);