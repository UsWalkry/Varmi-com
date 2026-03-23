import { query } from './src/database.js';

async function checkPhones() {
  try {
    const users = await query('SELECT email, firstName, lastName, phone FROM users WHERE phone IS NOT NULL ORDER BY created_at DESC');
    
    console.log('📱 Telefon numarası olan kullanıcılar:');
    console.log('═'.repeat(50));
    
    if (users.length === 0) {
      console.log('❌ Hiç telefon numarası kayıtlı kullanıcı yok');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   📱 Tel: ${user.phone}`);
        console.log('─'.repeat(40));
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

checkPhones();