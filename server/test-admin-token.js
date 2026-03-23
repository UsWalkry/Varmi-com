// Backend admin test script
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0MTViMGMxNy1jMmJkLTQwYTUtYWMzZC0xNTg1NzhmZjFkZjEiLCJpYXQiOjE3NjA2ODI1MTksImV4cCI6MTc2MTI4NzMxOX0.rMlqmUZmUzGQQNaTb95OG8VPNy4r6nd6m2XuOZzwlVM';

console.log('🔍 Testing /api/auth/me endpoint with your token...');

fetch('http://localhost:8787/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('📊 /api/auth/me Response:', data);
  
  if (data.success && data.user) {
    console.log('👤 User Email:', data.user.email);
    console.log('🏷️ User Role:', data.user.role);
    console.log('🎯 Is Admin?', data.user.role === 'admin');
    
    if (data.user.role === 'admin') {
      console.log('✅ Admin access should work!');
      
      // Admin API test
      console.log('🔧 Testing admin API...');
      return fetch('http://localhost:8787/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.log('❌ User is not admin, role:', data.user.role);
    }
  } else {
    console.log('❌ Failed to get user data:', data);
  }
})
.then(response => {
  if (response) {
    return response.json();
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