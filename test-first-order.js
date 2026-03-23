// Test first order details API
async function testFirstOrder() {
  try {
    const response = await fetch('http://localhost:8787/api/orders/6805d792-7d4f-4432-94da-102174412b24', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('auth_token'),
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('First Order API Response:', data);
    
    if (data.requiresReview) {
      console.log('✅ First order requires review - this is expected');
    } else {
      console.log('❌ First order does NOT require review - this is the bug');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testFirstOrder();