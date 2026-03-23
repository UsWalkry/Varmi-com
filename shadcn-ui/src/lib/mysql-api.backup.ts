// MYSQL API CLIENT - Supabase Yerine
// Bu dosya MySQL backend'e bağlantı sağlar

// Vite proxy kullanıyoruz - /api istekleri otomatik localhost:8787'ye yönlendirilir
const API_BASE = '/api';

class MySQLAPI {
  private baseURL: string;
  private token: string | null = null;
  // Update order status (seller only)
  async updateOrderStatus(orderId: string, data: { status: string; trackingNumber?: string; carrier?: string; estimatedDelivery?: string }) {
    return this.request(`/orders/${orderId}/update-status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // TEMPORARY: Transfer sample orders to current user
  async transferSampleOrders() {
    return this.request('/orders/transfer-sample-orders', {
      method: 'POST'
    });
  }tructor(baseURL: string) {
    this.baseURL = baseURL;
    // localStorage'dan token al (canonical key)
    this.token = localStorage.getItem('mysql-auth-token');
  }

  // Auth token'ı set et
  setToken(token: string | null) {
    this.token = token;
     if (token) {
      localStorage.setItem('mysql-auth-token', token);
    } else {
      localStorage.removeItem('mysql-auth-token');
    }
  }

  // Request helper
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Token varsa header'a ekle
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

      // Token geçersizse logout yap
      if (response.status === 401) {
        this.logout();
        throw new Error('Oturum süresi doldu');
      }

      const data = await response.json();
      console.log(`📋 Response Data:`, data);
      
      if (!response.ok) {
        console.error(`❌ API Error Response:`, data);
        throw new Error(data.message || data.error || 'Bir hata oluştu');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      console.error('❌ Full error details:', {
        url,
        method: options.method || 'GET',
        status: (error as any).status,
        message: (error as any).message
      });
      throw error;
    }
  }

  // Auth işlemleri
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  async getCurrentUser() {
    if (!this.token) return null;
    
    try {
      return await this.request('/auth/me');
    } catch {
      return null;
    }
  }

  logout() {
    this.setToken(null);
    // Sayfayı yenile
    window.location.href = '/';
  }

  // Listings
  async getListings() {
    return this.request('/listings');
  }

  async getActiveListings() {
    return this.request('/listings/active');
  }

  async getListing(id: string) {
    return this.request(`/listings/${id}`);
  }

  async createListing(listingData: {
    title: string;
    description: string;
    category: string;
    budgetMin: number;
    budgetMax: number;
    condition: string;
    deliveryType: string;
    expiresAt: string;
    images: string[];
  }) {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async updateListing(id: string, updates: any) {
    return this.request(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteListing(id: string) {
    return this.request(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  // Offers
  async getOffers() {
    return this.request('/offers');
  }

  async getOffersByListing(listingId: string) {
    return this.request(`/offers/listing/${listingId}`);
  }

  async getIncomingOffers() {
    return this.request('/offers/incoming');
  }

  async createOffer(offerData: {
    listingId: string;
    price: number;
    quantity: number;
    condition: string;
    deliveryType: string;
    shippingDesi?: number;
    shippingCost?: number;
    message?: string;
    validUntil: string;
    images: string[];
  }) {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify(offerData),
    });
  }

  async updateOffer(id: string, updates: any) {
    return this.request(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteOffer(id: string) {
    return this.request(`/offers/${id}`, {
      method: 'DELETE',
    });
  }

  async acceptOffer(id: string) {
    return this.request(`/offers/${id}/accept`, {
      method: 'POST',
    });
  }

  async rejectOffer(id: string) {
    return this.request(`/offers/${id}/reject`, {
      method: 'POST',
    });
  }

  async purchaseOffer(id: string, shippingAddress: any, billingAddress?: any, notes?: string) {
    return this.request(`/offers/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify({
        shippingAddress,
        billingAddress,
        notes
      }),
    });
  }

  // Favorites
  async getFavorites() {
    return this.request('/favorites');
  }

  async addFavorite(listingId: string) {
    return this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ listingId }),
    });
  }

  async removeFavorite(listingId: string) {
    return this.request(`/favorites/${listingId}`, {
      method: 'DELETE',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  // Orders
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(orderIdentifier: string) {
    const response = await this.request(`/orders/${orderIdentifier}`);
    return response?.success ? response.order : null;
  }

  // Create new order from accepted offers
  async createOrder(offerIds: number[], shippingAddress: string, billingAddress?: string, notes?: string) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        offerIds,
        shippingAddress,
        billingAddress,
        notes
      })
    });
  }

  // Get seller's sales
  async getSales() {
    return this.request('/orders/sales', {
      method: 'GET'
    });
  }

  // Update order status (seller only)
  async updateOrderStatus(orderId: string, data: { status: string; trackingNumber?: string; carrier?: string; estimatedDelivery?: string }) {
    return this.request(`/orders/${orderId}/update-status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Get user's own listings
  async getMyListings() {
    return this.request('/listings/my', {
      method: 'GET'
    });
  }

  // Get user's own offers
  async getMyOffers() {
    return this.request('/offers/my', {
      method: 'GET'
    });
  }

  // Cleanup favorites (remove invalid entries)
  async cleanupFavorites() {
    return this.request('/favorites/cleanup', {
      method: 'POST'
    });
  }

  // Respond to offer (accept/reject)
  async respondToOffer(offerId: string, action: 'accept' | 'reject') {
    return this.request(`/offers/${offerId}/${action}`, {
      method: 'POST'
    });
  }

  // Withdraw offer
  async withdrawOffer(offerId: string) {
    return this.request(`/offers/${offerId}`, {
      method: 'DELETE'
    });
  }

  // Profile operations
  async changeEmail(newEmail: string) {
    return this.request('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async updateProfile(profileData: {
    name?: string;
    city?: string;
    phone?: string;
    gender?: string;
    addressLine1?: string;
    district?: string;
    postalCode?: string;
  }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // TEMPORARY: Transfer sample orders to current user  
  async transferSampleOrders() {
    return this.request('/orders/transfer-sample-orders', {
      method: 'POST'
    });
  }
}

// Image URL helper
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath; // Already full URL
  const baseUrl = API_BASE.replace('/api', ''); // Remove /api to get base server URL
  return `${baseUrl}${imagePath}`;
};

// Singleton instance
export const mysqlAPI = new MySQLAPI(API_BASE);

// Helper functions (Supabase benzeri API)
export const getCurrentUser = () => mysqlAPI.getCurrentUser();
export const login = (email: string, password: string) => mysqlAPI.login(email, password);
export const register = (email: string, password: string, firstName: string, lastName: string) => mysqlAPI.register(email, password, firstName, lastName);
export const logout = () => mysqlAPI.logout();

export default mysqlAPI;