import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'varmi_db'
    });

    console.log('🔌 MySQL bağlantısı kuruldu\n');

    // Tüm kullanıcıları listele
    const [users] = await connection.execute(`
      SELECT id, email, firstName, lastName, role, created_at, email_verified
      FROM users 
      ORDER BY created_at ASC
    `);

    console.log('👥 Tüm Kullanıcılar:');
    console.log('═══════════════════════════════════════════════');
    
    users.forEach((user, index) => {
      const isAdmin = user.role === 'admin' ? '👑 ADMIN' : '👤 User';
      const isVerified = user.email_verified ? '✅' : '❌';
      
      console.log(`${index + 1}. ${isAdmin}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Ad Soyad: ${user.firstName} ${user.lastName}`);
      console.log(`   🔐 Rol: ${user.role || 'user'}`);
      console.log(`   ✉️ Email Doğrulandı: ${isVerified}`);
      console.log(`   📅 Kayıt Tarihi: ${new Date(user.created_at).toLocaleDateString('tr-TR')}`);
      console.log('───────────────────────────────────────────────');
    });

    // Admin kullanıcıları ayrı göster
    const [admins] = await connection.execute(`
      SELECT email, firstName, lastName 
      FROM users 
      WHERE role = 'admin'
    `);

    console.log('\n🔑 Admin Kullanıcılar:');
    console.log('═══════════════════════════════════════════════');
    
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`👑 ${admin.email} - ${admin.firstName} ${admin.lastName}`);
      });
      
      console.log('\n📝 Admin Panel Erişimi:');
      console.log('1. Yukarıdaki admin email ile giriş yapın');
      console.log('2. Kayıt olurken kullandığınız şifre ile login olun');
      console.log('3. Header\'da kullanıcı dropdown\'ında "Admin Panel" linki görünecek');
      console.log('4. /admin URL\'sine tıklayarak admin paneline erişin');
    } else {
      console.log('❌ Hiç admin kullanıcı bulunamadı!');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

listUsers();