// Sistem sıfırlama ve test utility
import { DataManager } from './mockData';

export const resetSystemAndTest = () => {
  console.log('=== SİSTEM RESET & TEST ===');
  
  // 1. Tüm verileri temizle
  console.log('1️⃣ Clearing all data...');
  DataManager.clearAllData();
  
  // 2. LocalStorage temizle
  console.log('2️⃣ Clearing localStorage...');
  ['userId', 'userEmail', 'userName', 'isLoggedIn'].forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 3. Yeni kullanıcı kaydı oluştur
  console.log('3️⃣ Creating new user...');
  const newUser = DataManager.registerUser({
    name: 'Test Kullanıcı',
    email: 'test@example.com',
    password: 'test123',
    city: 'İstanbul',
    phone: '+905551234567'
  });
  
  console.log('New user created:', newUser);
  
  // 4. Test ilanı oluştur
  if (newUser) {
    console.log('4️⃣ Creating test listing...');
    const testListing = DataManager.addListing({
      title: 'Test İlanı UUID',
      description: 'UUID sistem test ilanı',
      budgetMax: 750,
      category: 'Elektronik',
      condition: 'new' as const,
      city: 'İstanbul',
      images: ['https://via.placeholder.com/300x200?text=Test+Image'],
      deliveryType: 'both' as const,
      status: 'active' as const,
      buyerId: newUser.id,
      buyerName: newUser.name
    });
    
    console.log('Test listing created:', testListing);
    
    // 5. Durum kontrolü
    console.log('5️⃣ Final state:');
    console.log('- Users:', DataManager.getUsers().length);
    console.log('- Listings:', DataManager.getListings().length);
    console.log('- Offers:', DataManager.getOffers().length);
    console.log('- LocalStorage userId:', localStorage.getItem('userId'));
    
    return {
      user: newUser,
      listing: testListing
    };
  }
  
  return null;
};

// Global erişim
(window as any).resetSystemAndTest = resetSystemAndTest;

export default resetSystemAndTest;