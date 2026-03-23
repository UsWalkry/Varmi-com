// Sistemdeki tüm veriyi temizlemek için utility
import { DataManager } from './mockData';
import { supabase } from './supabase';

export async function clearAllData() {
  console.log('🗑️ Tüm sistem verilerini temizliyor...');
  
  // 1. LocalStorage temizle
  console.log('📱 localStorage temizleniyor...');
  localStorage.clear();
  
  // 2. DataManager state'ini reset et
  console.log('💾 DataManager reset ediliyor...');
  DataManager.clearAllData();
  
  // 3. Supabase tabloları temizle (eğer bağlantı varsa)
  try {
    console.log('🗄️ Supabase tabloları temizleniyor...');
    
    // Offers tablosunu temizle
    const { error: offersError } = await supabase
      .from('offers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil
    
    if (offersError) console.log('⚠️ Offers temizleme hatası:', offersError);
    else console.log('✅ Offers tablosu temizlendi');
    
    // Listings tablosunu temizle
    const { error: listingsError } = await supabase
      .from('listings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil
    
    if (listingsError) console.log('⚠️ Listings temizleme hatası:', listingsError);
    else console.log('✅ Listings tablosu temizlendi');
    
  } catch (error) {
    console.log('⚠️ Supabase temizleme hatası:', error);
  }
  
  console.log('🎉 Tüm veriler temizlendi! Sayfa yenileniyor...');
  
  // Sayfayı yenile
  window.location.reload();
}

// Global fonksiyon olarak ekle
(window as any).clearAllData = clearAllData;

// console.log('🔧 Debug: window.clearAllData() fonksiyonu hazır!');