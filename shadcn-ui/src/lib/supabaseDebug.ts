// Supabase verilerini kontrol etmek ve temizlemek için utility
import { supabase } from './supabase';

export async function checkSupabaseData() {
  // console.log('📊 Supabase verilerini kontrol ediyor...');
  
  try {
    // Listings tablosunu kontrol et
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (listingsError) {
      console.error('❌ Listings query error:', listingsError);
    } else {
      // console.log('📋 Listings tablosu:', listings?.length || 0, 'kayıt');
      listings?.forEach((listing, index) => {
        // console.log(`  ${index + 1}. ${listing.title} (${listing.buyer_name}) - ${listing.status}`);
      });
    }

    // Offers tablosunu kontrol et
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (offersError) {
      console.error('❌ Offers query error:', offersError);
    } else {
      // console.log('💰 Offers tablosu:', offers?.length || 0, 'kayıt');
      offers?.forEach((offer, index) => {
        // console.log(`  ${index + 1}. ${offer.seller_name} - ${offer.price}₺ (${offer.status})`);
      });
    }
    
    // console.log('✅ Supabase veri kontrolü tamamlandı');
    return { listings, offers };
    
  } catch (error) {
    console.error('❌ Supabase bağlantı hatası:', error);
    return null;
  }
}

export async function clearSupabaseData() {
  // console.log('🗑️ Supabase verilerini temizliyor...');
  
  try {
    // Önce offers tablosunu temizle (foreign key constraint)
    const { error: offersError } = await supabase
      .from('offers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil
    
    if (offersError) {
      console.error('❌ Offers silme hatası:', offersError);
    } else {
      // console.log('✅ Offers tablosu temizlendi');
    }
    
    // Sonra listings tablosunu temizle
    const { error: listingsError } = await supabase
      .from('listings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil
    
    if (listingsError) {
      console.error('❌ Listings silme hatası:', listingsError);
    } else {
      // console.log('✅ Listings tablosu temizlendi');
    }
    
    // console.log('🎉 Supabase verileri temizlendi!');
    return true;
    
  } catch (error) {
    console.error('❌ Supabase temizleme hatası:', error);
    return false;
  }
}

// Global fonksiyonlar olarak ekle
(window as any).checkSupabaseData = checkSupabaseData;
(window as any).clearSupabaseData = clearSupabaseData;

// console.log('🔧 Supabase Debug Tools:');
// console.log('  - window.checkSupabaseData() - Mevcut verileri listele');
// console.log('  - window.clearSupabaseData() - Tüm verileri temizle');
