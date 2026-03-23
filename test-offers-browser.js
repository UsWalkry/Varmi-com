// Browser console'da çalıştırmak için:
// 1. http://localhost:5173 sayfasını aç
// 2. F12 ile developer tools aç
// 3. Console tab'ına geç  
// 4. Bu kodu yapıştır ve çalıştır

async function testOffersAPI() {
  console.log('🔍 Testing offers API...');
  
  try {
    // Test listing ID (database'de var)
    const listingId = 'ba5dad8c-fd01-4c75-b4d3-1ce210c8f583';
    
    // API call
    const response = await fetch(`/api/offers/listing/${listingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (Array.isArray(data)) {
      console.log(`✅ Found ${data.length} offers`);
      data.forEach((offer, index) => {
        console.log(`Offer ${index + 1}:`, {
          id: offer.id,
          seller: offer.sellerName,
          amount: offer.amount,
          sellerRatingCount: offer.sellerRatingCount,
          sellerEmailVerified: offer.sellerEmailVerified
        });
      });
    } else {
      console.log('❌ Data is not an array:', typeof data);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

// Call the function
testOffersAPI();