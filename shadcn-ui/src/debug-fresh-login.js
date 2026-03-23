// Browser console'da çalıştırın - Fresh login için
console.log('🔄 Getting fresh token...');

// Mevcut token'ı kontrol et
const oldToken = localStorage.getItem('mysql-auth-token');
console.log('🔐 Old token exists:', oldToken ? 'YES' : 'NO');

// Login API'yi çağır
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'bybrkaydn@gmail.com',
    password: 'your-password-here' // Şifrenizi buraya yazın
  })
})
.then(response => response.json())
.then(data => {
  console.log('📊 Login response:', data);
  
  if (data.success && data.token) {
    console.log('✅ New token received');
    console.log('👤 User role:', data.user.role);
    
    // Yeni token ile admin API'yi test et
    return fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    console.log('❌ Login failed:', data.error);
    throw new Error('Login failed');
  }
})
.then(response => {
  console.log('🔧 Admin API Status:', response.status);
  return response.json();
})
.then(adminData => {
  console.log('🔧 Admin API Response:', adminData);
  
  if (adminData.success) {
    console.log('🎉 ADMIN ACCESS WORKS!');
  } else {
    console.log('❌ Admin access still failing:', adminData.message);
  }
})
.catch(error => {
  console.error('🚨 Error:', error);
});

console.log('💡 Şifrenizi yukarıdaki "your-password-here" yerine yazın ve çalıştırın');