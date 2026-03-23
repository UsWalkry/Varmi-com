// Admin debug script - browser console'da çalıştırın
console.log('🔍 Admin Debug Started');

// Mevcut auth durumunu kontrol et
const token = localStorage.getItem('mysql-auth-token');
console.log('🔐 Token:', token ? 'Exists' : 'Not found');

if (token) {
  // Token varsa kullanıcı bilgilerini çek
  fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('👤 User data:', data);
    
    if (data.success && data.user) {
      console.log('📧 Email:', data.user.email);
      console.log('🏷️ Role:', data.user.role);
      console.log('🎯 Is Admin:', data.user.role === 'admin');
      
      // Admin paneli erişimi test et
      if (data.user.role === 'admin') {
        console.log('✅ Admin access should be granted');
      } else {
        console.log('❌ User is not admin, access denied');
      }
    } else {
      console.log('❌ Failed to get user data:', data);
    }
  })
  .catch(error => {
    console.error('🚨 Error fetching user:', error);
  });
} else {
  console.log('❌ No token found, user not logged in');
}

// Admin API erişimi test et
if (token) {
  fetch('/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('🔧 Admin API test:', data);
  })
  .catch(error => {
    console.error('🚨 Admin API error:', error);
  });
}