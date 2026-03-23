import mysql from 'mysql2/promise';

const testUserSchema = async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: '',
    database: 'varmi_db',
    port: 3307
  });
  
  try {
    console.log('📋 Users table schema:');
    const [columns] = await conn.execute('DESCRIBE users');
    console.table(columns);
    
    console.log('\n📋 Sample user data:');
    const [users] = await conn.execute('SELECT id, email, first_name, last_name FROM users LIMIT 1');
    console.table(users);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await conn.end();
  }
};

testUserSchema();