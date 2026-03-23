const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'varmi_db',
      port: 3307
    });
    
    // Check offers table structure
    console.log('📋 OFFERS table columns:');
    const [offersColumns] = await connection.execute('DESCRIBE offers');
    console.table(offersColumns);
    
    // Check listings table structure
    console.log('\n📋 LISTINGS table columns:');
    const [listingsColumns] = await connection.execute('DESCRIBE listings');
    console.table(listingsColumns);
    
    // Check favorites table structure
    console.log('\n📋 FAVORITES table columns:');
    const [favoritesColumns] = await connection.execute('DESCRIBE favorites');
    console.table(favoritesColumns);
    
    // Check users table structure
    console.log('\n📋 USERS table columns:');
    const [usersColumns] = await connection.execute('DESCRIBE users');
    console.table(usersColumns);

    // Check what tables exist
    console.log('\n📋 Available tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTables();