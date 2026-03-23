// Quick test to create a listing and check system state
import { DataManager } from './mockData';

// Test fonksiyonu
export const createTestListing = () => {
  console.log('=== CREATING TEST LISTING ===');
  
  // Önce mevcut durumu kontrol et
  const users = DataManager.getUsers();
  const currentUserId = localStorage.getItem('userId');
  const currentUserEmail = localStorage.getItem('userEmail');
  const currentUserName = localStorage.getItem('userName');
  
  console.log('Current user info:', {
    userId: currentUserId,
    email: currentUserEmail,
    name: currentUserName
  });
  
  console.log('Existing users:', users.length);
  users.forEach(user => {
    console.log(`- User: ${user.name} (${user.email}) [ID: ${user.id}]`);
  });
  
  // Kullanıcı yoksa oluştur
  let activeUser = users.find(u => u.email === currentUserEmail);
  if (!activeUser && currentUserEmail && currentUserName) {
    activeUser = DataManager.registerUser({
      name: currentUserName,
      email: currentUserEmail,
      password: 'test123', // Test şifresi
      phone: '+900539846586',
      city: 'Afyonkarahisar'
    });
    console.log('Created new user:', activeUser);
  }
  
  if (!activeUser) {
    console.log('❌ No active user found, cannot create listing');
    return null;
  }
  
  // Test ilanı oluştur
  const testListing = {
    title: 'Test İlanı - Konsol',
    description: 'Console üzerinden oluşturulan test ilanı',
    price: 100,
    budgetMax: 150,
    category: 'Elektronik',
    condition: 'new' as const,
    city: 'Afyonkarahisar',
    images: [],
    deliveryType: 'both' as const,
    status: 'active' as const,
    buyerId: activeUser.id,
    buyerName: activeUser.name
  };
  
  const created = DataManager.addListing(testListing);
  console.log('Created listing:', created);
  
  // Son durumu kontrol et
  const allListings = DataManager.getListings();
  console.log('Total listings now:', allListings.length);
  
  console.log('=== TEST COMPLETE ===');
  return created;
};

// Global olarak erişilebilir yap
(window as any).createTestListing = createTestListing;

export default createTestListing;