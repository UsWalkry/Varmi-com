// Admin Auth Debug - Direk browser console'da çalıştırın
console.clear();
console.log('🔍 Admin Auth Debug Started');

// 1. Token kontrolü
const token = localStorage.getItem('mysql-auth-token');
console.log('🔐 Token:', token ? 'EXISTS' : 'MISSING');

if (!token) {
  console.log('❌ No token found - user needs to login');
} else {
  // 2. Auth API test
  fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 API Response Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Full API Response:', data);
    
    if (data.success) {
      console.log('✅ API Success');
      console.log('👤 User Email:', data.user.email);
      console.log('🏷️ User Role:', `"${data.user.role}"`);
      console.log('🔍 Role Type:', typeof data.user.role);
      console.log('🎯 Is Admin?', data.user.role === 'admin');
      console.log('🎯 Strict Equal Test:', JSON.stringify(data.user.role) === JSON.stringify('admin'));
      
      // Admin test
      if (data.user.role === 'admin') {
        console.log('✅ USER IS ADMIN - Should have access');
        
        // Try admin API
        return fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('❌ USER IS NOT ADMIN');
        console.log('Expected: "admin"');
        console.log('Received:', JSON.stringify(data.user.role));
      }
    } else {
      console.log('❌ API Failed:', data.error);
    }
  })
  .then(adminResponse => {
    if (adminResponse) {
      console.log('🔧 Admin API Status:', adminResponse.status);
      return adminResponse.json();
    }
  })
  .then(adminData => {
    if (adminData) {
      console.log('🔧 Admin API Response:', adminData);
    }
  })
  .catch(error => {
    console.error('🚨 Error:', error);
  });
}

// 3. Route kontrolü
console.log('🌐 Current URL:', window.location.href);
console.log('🌐 Current Path:', window.location.pathname);

// 4. React context debug (eğer varsa)
setTimeout(() => {
  console.log('🔄 Delayed check - React state might be loaded now');
  // Bu noktada React state yüklenmiş olmalı
}, 2000);