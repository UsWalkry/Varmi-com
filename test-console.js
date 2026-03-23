// Browser console'da çalıştır:
console.log('🔍 Current URL:', window.location.href);
console.log('🔍 Listing ID from URL:', window.location.pathname.split('/').pop());

// API'yi manual test et:
const testOffers = async () => {
  const listingId = window.location.pathname.split('/').pop();
  console.log('🔍 Testing API for listing:', listingId);
  
  try {
    const response = await fetch(`/api/offers/listing/${listingId}`);
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📥 API response:', data);
    
    if (data.offers) {
      console.log(`✅ Found ${data.offers.length} offers`);
      data.offers.forEach((offer, i) => {
        console.log(`Offer ${i + 1}:`, {
          id: offer.id,
          seller: offer.seller_name,
          price: offer.price,
          rating_count: offer.seller_rating_count,
          email_verified: offer.seller_email_verified
        });
      });
    } else {
      console.log('❌ No offers in response');
    }
  } catch (error) {
    console.error('❌ API error:', error);
  }
};

testOffers();