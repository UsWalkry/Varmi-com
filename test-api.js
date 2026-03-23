// Test script for API debugging
// Run this in browser console to test API calls

const testOrderAPI = async () => {
  // Get token from localStorage
  const token = localStorage.getItem('mysql-auth-token');
  console.log('🔑 Token:', token ? 'exists' : 'not found');
  
  if (!token) {
    console.error('❌ No token found in localStorage');
    return;
  }
  
  // Test order details API
  const orderId = '1'; // Change this to a valid order ID
  const url = `http://localhost:8787/api/orders/${orderId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    const responseText = await response.text();
    console.log('📄 Response text:', responseText);
    
    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Parsed data:', data);
      } catch (e) {
        console.error('❌ JSON parse error:', e);
      }
    }
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
};

// Run the test
console.log('🧪 Starting API test...');
testOrderAPI();