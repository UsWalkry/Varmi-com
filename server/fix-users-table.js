import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixUserTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db'
    });

    console.log('🔌 MySQL bağlantısı kuruldu');

    // Users tablosunun yapısını kontrol et
    console.log('📋 Users tablosu yapısı:');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM users
    `);
    
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
    });

    // Role sütunu var mı kontrol et
    const hasRole = columns.some(col => col.Field === 'role');
    
    if (!hasRole) {
      console.log('\n➕ Role sütunu ekleniyor...');
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'user' AFTER email
      `);
      console.log('✅ Role sütunu eklendi');
    } else {
      console.log('✅ Role sütunu zaten mevcut');
    }

    // Kullanıcı sayısını kontrol et
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Toplam kullanıcı sayısı: ${userCount[0].count}`);

    if (userCount[0].count > 0) {
      // İlk kullanıcıyı admin yap
      const [users] = await connection.execute(`
        SELECT id, email, firstName, lastName, role 
        FROM users 
        ORDER BY created_at ASC 
        LIMIT 1
      `);

      if (users.length > 0) {
        const firstUser = users[0];
        await connection.execute(`
          UPDATE users SET role = 'admin' WHERE id = ?
        `, [firstUser.id]);
        
        console.log(`✅ ${firstUser.email} admin yapıldı`);
      }

      // Admin kullanıcıları listele
      const [admins] = await connection.execute(`
        SELECT id, email, firstName, lastName, role 
        FROM users 
        WHERE role = 'admin'
      `);

      console.log('\n🔑 Admin kullanıcılar:');
      admins.forEach(admin => {
        console.log(`  - ${admin.email} (${admin.firstName} ${admin.lastName})`);
      });
    } else {
      console.log('⚠️ Henüz hiç kullanıcı yok. Önce kayıt olun.');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixUserTable();