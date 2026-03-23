import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function makeUserAdmin() {
  let connection;
  
  try {
    // Database bağlantısı
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db'
    });

    console.log('🔌 Connected to MySQL database');

    // Role sütununu kontrol et ve ekle (eğer yoksa)
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER email
      `);
      console.log('✅ Role column added to users table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Role column already exists');
      } else {
        console.log('Error adding role column:', error.message);
      }
    }

    // Tüm kullanıcıları listele
    const [users] = await connection.execute(`
      SELECT id, email, firstName, lastName, role, created_at 
      FROM users 
      ORDER BY created_at ASC
    `);

    console.log('👥 Current users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} (${user.role || 'user'})`);
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please register a user first.');
      return;
    }

    // İlk kullanıcıya admin rolü ata
    const firstUser = users[0];
    await connection.execute(`
      UPDATE users SET role = 'admin' WHERE id = ?
    `, [firstUser.id]);

    console.log(`✅ User ${firstUser.email} has been made admin`);

    // Admin kullanıcıları göster
    const [adminUsers] = await connection.execute(`
      SELECT id, email, firstName, lastName, role 
      FROM users 
      WHERE role = 'admin'
    `);

    console.log('\n🔑 Admin users:');
    adminUsers.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.firstName} ${admin.lastName})`);
    });

    console.log('\n🎉 Admin setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Login with admin credentials');
    console.log('2. Look for "Admin Panel" in the user dropdown');
    console.log('3. Access admin panel at /admin');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

makeUserAdmin();