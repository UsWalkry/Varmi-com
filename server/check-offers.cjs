// Quick check offers table
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Empty password from .env
  database: 'varmi_db', // Correct database name
  port: 3307 // Correct port
});

db.execute('SELECT id, price, seller_id, listing_id, product_name FROM offers LIMIT 5', (err, results) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Sample offers:');
  results.forEach(offer => {
    console.log(`ID: ${offer.id}, Price: ${offer.price} (type: ${typeof offer.price}), Product: ${offer.product_name}`);
  });
  
  db.end();
});