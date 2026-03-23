const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminUser() {
  try {
    console.log('🔍 Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('📋 Checking admin user...');
    const [rows] = await connection.execute(
      'SELECT id, email, firstName, lastName, role FROM users WHERE email = ?',
      ['bybrkaydn@gmail.com']
    );

    console.log('👤 Admin user:', rows[0] || 'Not found');
    
    // Tüm kullanıcıları da listele
    console.log('\n📋 All users with roles:');
    const [allUsers] = await connection.execute(
      'SELECT id, email, firstName, lastName, role FROM users ORDER BY id'
    );
    
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role || 'no role'})`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUser();