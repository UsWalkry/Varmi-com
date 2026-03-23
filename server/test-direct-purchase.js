// Test purchase endpoint directly
// Usage: node test-direct-purchase.js <offerId> <token>

import fetch from 'node-fetch';

const API_URL = 'http://localhost:8787';

async function testPurchase() {
  const offerId = process.argv[2] || '5a1ff192-50eb-4f41-a704-840b1b8995d9';
  const token = process.argv[3];

  if (!token) {
    console.log('❌ Token gerekli!');
    console.log('Kullanım: node test-direct-purchase.js <offerId> <token>');
    console.log('\nToken\'ı localStorage\'dan alabilirsin: mysql-auth-token');
    return;
  }

  const purchaseData = {
    quantity: 1,
    totalAmount: 100,
    userInfo: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '5551234567',
      address: 'Test Address',
      city: 'Istanbul',
      postalCode: '34000'
    },
    paymentInfo: {
      cardName: 'Test Card',
      cardNumber: '4242424242424242',
      expiry: '12/25',
      cvv: '123'
    },
    useCommissionBalance: false,
    commissionAmount: 0
  };

  console.log('🛒 Purchase testi başlıyor...');
  console.log('Offer ID:', offerId);
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('\n📦 Gönderilen data:', JSON.stringify(purchaseData, null, 2));

  try {
    const response = await fetch(`${API_URL}/api/offers/${offerId}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(purchaseData)
    });

    const responseText = await response.text();
    console.log('\n📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    try {
      const data = JSON.parse(responseText);
      console.log('\n✅ Response Data:');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('\n❌ Response (non-JSON):');
      console.log(responseText);
    }

  } catch (error) {
    console.error('\n❌ Fetch error:', error.message);
    console.error(error);
  }
}

testPurchase();
