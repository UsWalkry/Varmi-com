console.log('🔍 Checking auth status...');
console.log('Token:', localStorage.getItem('mysql-auth-token'));
console.log('Old token:', localStorage.getItem('auth_token'));

// Eğer eski token varsa yeni key'e taşı
const oldToken = localStorage.getItem('auth_token');
if (oldToken && !localStorage.getItem('mysql-auth-token')) {
  localStorage.setItem('mysql-auth-token', oldToken);
  localStorage.removeItem('auth_token');
  console.log('✅ Token migrated from auth_token to mysql-auth-token');
}