// Debug utility to check current user and system state
export const debugCurrentState = () => {
  console.log('=== CURRENT STATE DEBUG ===');
  
  // LocalStorage bilgileri
  console.log('LocalStorage Data:');
  console.log('- userId:', localStorage.getItem('userId'));
  console.log('- userEmail:', localStorage.getItem('userEmail'));
  console.log('- userName:', localStorage.getItem('userName'));
  console.log('- isLoggedIn:', localStorage.getItem('isLoggedIn'));
  
  // DataManager'dan veri
  const { DataManager } = require('./mockData');
  console.log('DataManager Data:');
  const users = DataManager.getUsers();
  const listings = DataManager.getListings();
  const offers = DataManager.getOffers();
  
  console.log(`- Users count: ${users.length}`);
  users.forEach((user, idx) => {
    console.log(`  User ${idx}:`, {
      id: user.id,
      name: user.name,
      email: user.email
    });
  });
  
  console.log(`- Listings count: ${listings.length}`);
  listings.forEach((listing, idx) => {
    console.log(`  Listing ${idx}:`, {
      id: listing.id,
      title: listing.title,
      buyerId: listing.buyerId,
      buyerName: listing.buyerName
    });
  });
  
  console.log(`- Offers count: ${offers.length}`);
  offers.forEach((offer, idx) => {
    console.log(`  Offer ${idx}:`, {
      id: offer.id,
      listingId: offer.listingId,
      sellerId: offer.sellerId,
      sellerName: offer.sellerName,
      amount: offer.amount
    });
  });
  
  console.log('=== END DEBUG ===');
};

// Global olarak erişilebilir yap
(window as any).debugCurrentState = debugCurrentState;

export default debugCurrentState;