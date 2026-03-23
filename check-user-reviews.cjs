const mysql = require('mysql2/promise');

async function checkUserReviewsTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root', 
      password: '',
      database: 'varmi_db',
      port: 3307
    });

    console.log('🔍 user_reviews table structure:');
    const [columns] = await connection.execute('DESCRIBE user_reviews');
    console.table(columns);

    console.log('\n🔍 Sample data:');
    const [rows] = await connection.execute('SELECT * FROM user_reviews LIMIT 3');
    console.table(rows);

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUserReviewsTable();