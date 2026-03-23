// Browser console'da çalıştırın - Admin API test with detailed logging
console.clear();
console.log('🔍 Admin API Test with Backend Logs');

const token = localStorage.getItem('mysql-auth-token');
console.log('🔐 Using token:', token ? token.substring(0, 50) + '...' : 'MISSING');

if (token) {
  console.log('📤 Making /api/admin/users request...');
  console.log('⚠️ Backend console\'da admin middleware loglarını izleyin!');
  
  fetch('/api/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', [...response.headers.entries()]);
    return response.json();
  })
  .then(data => {
    console.log('📊 Response Data:', data);
    
    if (data.success === false) {
      console.log('❌ Request failed with message:', data.message);
      
      if (data.message === 'Yetkisiz erişim') {
        console.log('💡 Bu hata admin middleware\'in ilk kısmında oluyor (userId bulunamadı)');
      } else if (data.message === 'Admin yetkisi gerekli') {
        console.log('💡 Bu hata admin middleware\'in ikinci kısmında oluyor (role != admin)');
      }
    }
  })
  .catch(error => {
    console.error('🚨 Request Error:', error);
  });
}

console.log('🔍 Backend restart edildi mi? Middleware değişikliklerin etkili olması için gerekli.');
console.log('🔍 Backend terminal\'da admin middleware loglarını arayın:');
console.log('  - "🔍 Admin middleware - userId:"');
console.log('  - "🔍 Admin middleware - User role:"');
console.log('  - "✅ Admin middleware - Access granted"');