// Browser localStorage'da kalan eski verileri kontrol et ve temizle
console.log('🔍 localStorage verilerini kontrol ediyor...');

// Tüm localStorage anahtarlarını listele
const allKeys = Object.keys(localStorage);
console.log('📦 localStorage anahtarları:', allKeys);

// Listings ile ilgili veriler var mı?
const listingsKeys = allKeys.filter(key => 
  key.includes('listing') || 
  key.includes('Listing') || 
  key.includes('data') ||
  key.includes('Data')
);
console.log('📋 İlan ile ilgili anahtarlar:', listingsKeys);

// Her anahtar için değerleri göster
listingsKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key);
    console.log(`📝 ${key}:`, value ? JSON.parse(value) : value);
  } catch (e) {
    console.log(`📝 ${key}:`, localStorage.getItem(key));
  }
});

// Supabase session verisi var mı?
const supabaseKeys = allKeys.filter(key => key.includes('supabase'));
console.log('🔐 Supabase anahtarları:', supabaseKeys);

supabaseKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key);
    console.log(`🔐 ${key}:`, value ? JSON.parse(value) : value);
  } catch (e) {
    console.log(`🔐 ${key}:`, localStorage.getItem(key));
  }
});

// Potansiyel eski verileri temizle
function clearOldData() {
  console.log('🧹 Eski verileri temizliyor...');
  
  // Eski ilan verilerini temizle
  const keysToRemove = allKeys.filter(key => 
    key.includes('listing') || 
    key.includes('Listing') ||
    key.includes('data') ||
    key.includes('Data') ||
    key.includes('cache') ||
    key.includes('Cache')
  );
  
  keysToRemove.forEach(key => {
    console.log(`🗑️ Siliniyor: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log('✅ Temizlik tamamlandı!');
  
  // Sayfayı yenile
  window.location.reload();
}

// Global fonksiyon olarak tanımla
window.clearOldData = clearOldData;

console.log('💡 Eski verileri temizlemek için console\'da clearOldData() çalıştırın');