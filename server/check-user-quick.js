import { query } from './src/database.js';

async function checkUser() {
    try {
        console.log('🔍 Checking user: dijitallkitap@gmail.com');
        
        const users = await query('SELECT email, firstName, lastName, password_hash FROM users WHERE email = ?', ['dijitallkitap@gmail.com']);
        
        if (users.length > 0) {
            const user = users[0];
            console.log('✅ User found:');
            console.log('📧 Email:', user.email);
            console.log('👤 Name:', user.firstName, user.lastName);
            console.log('🔐 Has password:', !!user.password_hash);
            console.log('🔑 Password hash starts with:', user.password_hash ? user.password_hash.substring(0, 10) + '...' : 'NO PASSWORD');
        } else {
            console.log('❌ User not found in database!');
        }
        
    } catch (error) {
        console.error('💥 Database error:', error.message);
    }
    
    process.exit(0);
}

checkUser();