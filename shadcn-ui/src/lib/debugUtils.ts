// Debug utilities for development
import { clearAllData } from './clearAllData';

export class DebugUtils {
  static async clearAllData() {
    await clearAllData();
  }
  
  // Legacy temizleme metodu (eski key'ler için)
  static clearLegacyData() {
    localStorage.removeItem('varmi_users');
    localStorage.removeItem('varmi_current_user');
    localStorage.removeItem('varmi_offers');
    localStorage.removeItem('varmi_listings');
    localStorage.removeItem('varmi_messages');
    localStorage.removeItem('varmi_user_favorites');
    localStorage.removeItem('varmi_orders');
    localStorage.removeItem('varmi_login_logs');
    localStorage.removeItem('varmi_sessions');
    localStorage.removeItem('varmi_pending_login');
    console.log('🧹 All localStorage data cleared');
    window.location.reload();
  }

  static showCurrentData() {
    const data = {
      users: JSON.parse(localStorage.getItem('varmi_users') || '[]'),
      currentUser: JSON.parse(localStorage.getItem('varmi_current_user') || 'null'),
      offers: JSON.parse(localStorage.getItem('varmi_offers') || '[]'),
      listings: JSON.parse(localStorage.getItem('varmi_listings') || '[]')
    };
    console.log('📊 Current localStorage data:', data);
    return data;
  }

  static fixUserNames() {
    const users = JSON.parse(localStorage.getItem('varmi_users') || '[]');
    const offers = JSON.parse(localStorage.getItem('varmi_offers') || '[]');
    
    // Update offers with correct user names
    const updatedOffers = offers.map((offer: any) => {
      if (offer.sellerName === 'Satıcı' || !offer.sellerName) {
        const user = users.find((u: any) => u.id === offer.sellerId);
        if (user) {
          offer.sellerName = user.name;
          console.log(`Fixed offer ${offer.id} seller name to: ${user.name}`);
        }
      }
      return offer;
    });
    
    localStorage.setItem('varmi_offers', JSON.stringify(updatedOffers));
    console.log('🔧 Fixed user names in offers');
    window.location.reload();
  }
}

// Global debug fonksiyonları (console'da kullanım için)
(window as any).debugUtils = {
  clear: () => DebugUtils.clearAllData(),
  show: () => DebugUtils.showCurrentData(),
  fixNames: () => DebugUtils.fixUserNames()
};