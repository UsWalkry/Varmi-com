// Browser console'da çalıştırın - Admin role kontrolü
console.log('🔍 Admin Role Debug - Frontend');

// Mevcut token'ı kontrol et
const token = localStorage.getItem('mysql-auth-token');
console.log('🔐 Current token:', token ? 'Found' : 'Not found');

if (token) {
  console.log('📤 Making /api/auth/me request...');
  
  fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log('📊 Full response:', data);
    
    if (data.success && data.user) {
      console.log('👤 User details:');
      console.log('  📧 Email:', data.user.email);
      console.log('  🏷️ Role:', data.user.role);
      console.log('  📝 First Name:', data.user.firstName);
      console.log('  📝 Last Name:', data.user.lastName);
      console.log('  🎯 Is Admin?', data.user.role === 'admin');
      
      // Eğer admin değilse, database'de kontrol edelim
      if (data.user.role !== 'admin') {
        console.log('⚠️ User role is not admin. Expected: admin, Got:', data.user.role);
        console.log('💡 Need to check database and update user role');
      } else {
        console.log('✅ User has admin role! Admin panel should work now.');
        
        // Admin API test
        console.log('🔧 Testing admin API access...');
        fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(response => response.json())
        .then(adminData => {
          console.log('🔧 Admin API result:', adminData);
        })
        .catch(error => {
          console.error('🚨 Admin API error:', error);
        });
      }
    } else {
      console.log('❌ Failed to get user data:', data);
      console.log('💡 Try logging out and logging back in');
    }
  })
  .catch(error => {
    console.error('🚨 Request error:', error);
  });
} else {
  console.log('❌ No token found. Please login first.');
}

// Auth state debug
console.log('🔍 Current window.location:', window.location.href);
console.log('🔍 LocalStorage keys:', Object.keys(localStorage));