// Test admin dashboard stats API
fetch('http://localhost:8787/api/admin/dashboard/stats', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('📊 Admin Dashboard Stats Response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.success && data.stats) {
    console.log('\n📈 Individual Stats:');
    console.log('Users:', data.stats.users);
    console.log('Listings:', data.stats.listings);
    console.log('Views:', data.stats.views);
    console.log('Favorites:', data.stats.favorites);
    console.log('Offers:', data.stats.offers);
    console.log('Orders:', data.stats.orders);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});

// Test admin dashboard activity API
fetch('http://localhost:8787/api/admin/dashboard/activity', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('mysql-auth-token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('\n📋 Admin Dashboard Activity Response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.success && data.activity) {
    console.log('\n📋 Individual Activities:');
    console.log('Users:', data.activity.users);
    console.log('Listings:', data.activity.listings);
    console.log('Orders:', data.activity.orders);
  }
})
.catch(error => {
  console.error('❌ Activity Error:', error);
});