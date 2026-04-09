// MYSQL API CLIENT - Supabase Yerine
// Bu dosya MySQL backend'e bağlantı sağlar

// Debug mode kontrolü - açık
const DEBUG_MODE = true; // import.meta.env.VITE_DEBUG_MODE === 'true';
const log = (...args: any[]) => {
  if (DEBUG_MODE) console.log(...args);
};
const logError = (...args: any[]) => {
  if (DEBUG_MODE) console.error(...args);
};

// Vite proxy kullan - daha güvenilir
const API_BASE = '/api';

// log('🔧 API_BASE set to:', API_BASE);
// log('🔧 Using Vite proxy');

class MySQLAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    // log('🔧 MySQLAPI constructor called with baseURL:', baseURL);
    this.baseURL = baseURL;
    // log('🔧 this.baseURL set to:', this.baseURL);
    // localStorage'dan token al
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
    // log('🔧 Building URL:', { baseURL: this.baseURL, endpoint, finalURL: url });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

      // log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      // log(`📡 Response Status: ${response.status} ${response.statusText}`);

      // Response text'ini önce al
      const responseText = await response.text();
      // log(`📄 Response Text (first 200 chars):`, responseText.substring(0, 200));

      // JSON parse et
      let parsedResponse;
      if (responseText) {
        try {
          parsedResponse = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ JSON Parse Error:', parseError);
          console.error('❌ Response Text:', responseText);
          console.error('❌ URL:', url);
          console.error('❌ Status:', response.status);
          return { 
            success: false, 
            error: 'Sunucudan geçersiz yanıt alındı. Lütfen sayfayı yenileyip tekrar deneyin.',
            debug: {
              url,
              status: response.status,
              responseStart: responseText.substring(0, 200)
            }
          };
        }
      }

      // Token geçersizse logout yap (ama login/register/cart endpoint'i için değil)
      if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/cart')) {
        this.setToken(null);
        window.location.href = '/';
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        // logError(`❌ API Request failed: ${response.status} ${response.statusText}`);
        // Backend'den gelen error mesajını kullan
        if (parsedResponse) {
          return parsedResponse; // Backend'den gelen tam response'u dön (success, error, emailVerificationRequired vb.)
        }
        return { 
          success: false, 
          error: `Request failed: ${response.status} ${response.statusText}` 
        };
      }

      // Başarılı response
      if (parsedResponse) {
        return parsedResponse;
      } else {
        return { success: true };
      }
    } catch (error) {
      logError('❌ API Request Error:', error);
      log('❌ Full error details:', {
        url,
        method: options.method || 'GET',
        status: (error as any)?.status,
        message: (error as any)?.message || error?.toString()
      });
      throw error;
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(email: string, password: string, firstName: string, lastName: string, city?: string | null, phone?: string | null, gender?: string | null, addressLine1?: string | null, district?: string | null, postalCode?: string | null) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password, 
        firstName,
        lastName: lastName || null,
        city: city || null,
        phone: phone || null,
        gender: gender || null,
        addressLine1: addressLine1 || null,
        district: district || null,
        postalCode: postalCode || null
      }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async verifyEmail(token: string) {
    return this.request(`/auth/verify-email/${token}`, {
      method: 'GET'
    });
  }

  async resendEmailVerification(email: string) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  logout() {
    this.setToken(null);
    // window.location.href = '/'; // Bu satırı kaldırıyoruz - hook'ta halledelim
  }

  // Generic HTTP methods
  async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET'
    });
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  // Listings
  async getListings() {
    return this.request('/listings');
  }

  async getActiveListings() {
    return this.request('/listings/active');
  }

  async getFeaturedListings() {
    return this.request('/listings/featured');
  }

  async getListing(id: string) {
    return this.request(`/listings/${id}`);
  }

  // Alias for getListing - for compatibility
  async getListingById(id: string) {
    return this.getListing(id);
  }

  async createListing(listingData: {
    title: string;
    description?: string;
    category: string;
    city?: string;
    condition?: string;
    deliveryType?: string;
    budgetMax: number;
    offersPublic?: boolean;
    offersPurchasable?: boolean;
    maskOwnerName?: boolean;
    images: string[];
  }) {
    return this.request('/listings/create', {
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

  async getOfferById(offerId: string) {
    return this.request(`/offers/${offerId}`);
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

  async purchaseOffer(id: string, purchaseData: {
    quantity: number;
    totalAmount: number;
    userInfo: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      postalCode: string;
    };
    paymentInfo: {
      cardName: string;
      cardNumber: string;
      expiry: string;
      cvv: string;
    };
    useCommissionBalance?: boolean;
    commissionAmount?: number;
  }) {
    return this.request(`/offers/${id}/purchase`, {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  }

  // Favorites
  async getFavorites() {
    return this.request('/favorites');
  }

  async addFavorite(listingId: string) {
    return this.request(`/listings/${listingId}/favorite`, {
      method: 'POST',
    });
  }

  async removeFavorite(listingId: string) {
    return this.request(`/listings/${listingId}/favorite`, {
      method: 'POST',
    });
  }

  // Alias functions for FavoriteButton compatibility
  async addToFavorites(listingId: string) {
    return this.addFavorite(listingId);
  }

  async removeFromFavorites(listingId: string) {
    return this.removeFavorite(listingId);
  }

  // Check if listing is in favorites
  async isFavorite(listingId: string) {
    try {
      const response = await this.getFavorites();
      log('🔍 isFavorite check:', { listingId, response });
      
      // Support both 'favorites' and 'data' response formats
      const favoritesArray = response.favorites || response.data || [];
      
      if (response.success && favoritesArray) {
        const isFav = favoritesArray.some((fav: any) => fav.listing_id === listingId);
        log('✅ isFavorite result:', { listingId, isFav, favoritesCount: favoritesArray.length });
        return isFav;
      }
      log('❌ isFavorite: no favorites data');
      return false;
    } catch (error) {
      logError('❌ Error checking favorite status:', error);
      return false;
    }
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead() {
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  // Orders
  async getOrders() {
    log('🔍 getOrders API call started');
    try {
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const result = await this.request(`/orders?t=${timestamp}`);
      log('🔍 getOrders API response:', result);
      return result;
    } catch (error) {
      logError('🔍 getOrders API error:', error);
      throw error;
    }
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
    // Add cache-busting parameter to ensure fresh data
    const timestamp = Date.now();
    return this.request(`/orders/sales?t=${timestamp}`, {
      method: 'GET'
    });
  }

  // Start processing order (İşlemi Başlat)
  async startOrderProcessing(orderId: string) {
    return this.request(`/orders/${orderId}/start-processing`, {
      method: 'PATCH'
    });
  }

  // Add shipping information
  async addShippingInfo(orderId: string, data: { 
    trackingNumber: string; 
    carrierCompany: string; 
    estimatedDelivery?: string; 
    notes?: string 
  }) {
    return this.request(`/orders/${orderId}/add-shipping`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Mark order as delivered (for buyers)
  async markOrderAsDelivered(orderId: string, notes?: string) {
    return this.request(`/orders/${orderId}/mark-delivered`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
  }

  async submitOrderReview(orderId: string, data: { rating: number; comment: string }) {
    return this.request(`/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Get order tracking information
  async getOrderTracking(orderId: string) {
    return this.request(`/orders/${orderId}/tracking`);
  }

  // Get order details (enhanced)
  async getOrderDetails(orderId: string) {
    return this.request(`/orders/${orderId}`);
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

  // Cleanup orphaned favorites
  async cleanupFavorites() {
    return this.request('/favorites/cleanup', {
      method: 'POST'
    });
  }

  // Respond to offer (accept/reject)
  async respondToOffer(offerId: string | number, action: 'accept' | 'reject') {
    const status = action === 'accept' ? 'accepted' : 'rejected';
    return this.request(`/offers/${offerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // Withdraw offer
  async withdrawOffer(offerId: string | number) {
    return this.request(`/offers/${offerId}`, {
      method: 'DELETE'
    });
  }

  // TEMPORARY: Transfer sample orders to current user  
  async transferSampleOrders() {
    return this.request('/orders/transfer-sample-orders', {
      method: 'POST'
    });
  }

  // Profile update
  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    gender?: string;
    birthDate?: string;
    addressLine1?: string;
    district?: string;
    postalCode?: string;
  }) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changeEmail(newEmail: string) {
    return this.request('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail })
    });
  }

  // Upload listing images
  async uploadListingImages(files: FileList | File[]) {
    const formData = new FormData();
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      formData.append('images', file);
    });

    // FormData için Content-Type header'ını kaldırıyoruz (browser otomatik set eder)
    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const url = `${this.baseURL}/listings/upload-images`;
      log(`🌐 API Request: POST ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      log(`📡 Response Status: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        this.setToken(null);
        return { success: false, error: 'Unauthorized' };
      }

      const responseText = await response.text();
      log(`📄 Response Text (first 200 chars):`, responseText.substring(0, 200));

      if (!response.ok) {
        logError(`❌ API Request failed: ${response.status} ${response.statusText}`);
        return { 
          success: false, 
          error: `Request failed: ${response.status} ${response.statusText}` 
        };
      }

      if (responseText) {
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          logError('❌ JSON Parse Error:', parseError);
          return { success: false, error: 'Invalid JSON response' };
        }
      } else {
        return { success: true };
      }
    } catch (error) {
      logError('❌ Upload Error:', error);
      throw error;
    }
  }

  // User Profile Methods
  async getUserProfile(userId: string) {
    return this.request(`/users/${userId}/profile`);
  }

  async getUserListings(userId: string) {
    return this.request(`/users/${userId}/listings`);
  }

  async getUserOffers(userId: string) {
    return this.request(`/users/${userId}/offers`);
  }

  async getUserFavorites(userId: string) {
    return this.request(`/users/${userId}/favorites`);
  }

  async getUserReviews(userId: string) {
    return this.request(`/users/${userId}/reviews`);
  }


  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  async loginWith2FA(userId: string, token: string, method: 'authenticator' | 'email' = 'authenticator') {
    const result = await this.request('/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify({ userId, token, method })
    });

    // Başarılı giriş varsa token'ı kaydet
    if (result.success && result.token) {
      log('💾 Saving JWT token from 2FA login');
      this.setToken(result.token);
    }

    return result;
  }

  // 2FA Setup and Management
  async setup2FA() {
    return this.request('/auth/2fa/setup', {
      method: 'POST'
    });
  }

  async verify2FA(token: string) {
    return this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async disable2FA(token: string, password: string) {
    return this.request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
  }

  async get2FAStatus() {
    return this.request('/auth/2fa/status');
  }

  async toggleEmail2FA(enabled: boolean) {
    return this.request('/auth/2fa/email/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  async sendEmail2FACode(userId: string) {
    return this.request('/auth/login/email-2fa/send', {
      method: 'POST', 
      body: JSON.stringify({ userId })
    });
  }

  // Notification settings
  async getNotificationSettings() {
    return this.request('/notifications/settings', {
      method: 'GET'
    });
  }

  async updateNotificationSettings(settings: { email_notifications: boolean; sms_notifications: boolean }) {
    return this.request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // ADMIN API METHODS
  
  // Dashboard istatistikleri
  async getAdminDashboardStats() {
    return this.request('/admin/dashboard/stats');
  }

  // Son aktiviteler
  async getAdminDashboardActivity() {
    return this.request('/admin/dashboard/activity');
  }

  // Admin kullanıcı listesi
  async getAdminUsers(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    return this.request(`/admin/users${queryString ? '?' + queryString : ''}`);
  }

  // Yeni kullanıcı oluşturma (admin)
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // Kullanıcı güncelleme (admin)
  async updateUser(userId: string, userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role?: string;
    password?: string;
  }) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  // Kullanıcı askıya alma
  async suspendUser(userId: string, reason?: string) {
    return this.request(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Kullanıcı aktif hale getirme
  async activateUser(userId: string) {
    return this.request(`/admin/users/${userId}/activate`, {
      method: 'POST'
    });
  }

  // Kullanıcıya email gönderme (admin)
  async sendEmailToUser(userId: string, emailData: {
    subject: string;
    message: string;
    emailType?: string;
  }) {
    return this.request(`/admin/users/${userId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  }

  // Kullanıcı silme (admin)
  async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Doğrulama emaili yeniden gönder (admin)
  async adminResendVerification(userId: string) {
    return this.request(`/admin/users/${userId}/resend-verification`, {
      method: 'POST'
    });
  }

  // Admin ilan listesi
  async getAdminListings(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const queryString = searchParams.toString();
    return this.request(`/admin/listings${queryString ? '?' + queryString : ''}`);
  }

  // İlan durumu değiştirme
  async updateListingStatus(listingId: string, status: string, reason?: string) {
    return this.request(`/admin/listings/${listingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason })
    });
  }

  // Admin: İlan silme
  async deleteListingAsAdmin(listingId: string) {
    return this.request(`/admin/listings/${listingId}`, {
      method: 'DELETE'
    });
  }

  async updateListingFeatured(listingId: string, featured: boolean) {
    return this.request(`/admin/listings/${listingId}/featured`, {
      method: 'PUT',
      body: JSON.stringify({ featured })
    });
  }

  async getAdminOrders(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const url = `/admin/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return this.request(url);
  }

  async updateOrderStatus(orderId: string, status: string, trackingNumber?: string) {
    return this.request(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, trackingNumber })
    });
  }

  async cancelOrder(orderId: string, data: { reason: string }) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async returnOrder(orderId: string, data: { reason: string; images?: FileList }) {
    const formData = new FormData();
    formData.append('reason', data.reason);
    
    if (data.images) {
      Array.from(data.images).forEach((file) => {
        formData.append('images', file);
      });
    }

    return this.request(`/orders/${orderId}/return`, {
      method: 'POST',
      headers: {}, // FormData olduğu için Content-Type otomatik set edilecek
      body: formData
    });
  }

  async getAdminOrderDetail(orderId: string) {
    return this.request(`/admin/orders/${orderId}`);
  }

  // USER ADDRESSES
  async getAddresses() {
    return this.request('/addresses', { method: 'GET' });
  }

  async addAddress(address: {
    title?: string;
    recipient_name?: string;
    phone?: string;
    address_line1: string;
    address_line2?: string;
    district?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
  }) {
    return this.request('/addresses', {
      method: 'POST',
      body: JSON.stringify(address)
    });
  }

  async updateAddress(id: string, address: {
    title?: string;
    recipient_name?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    district?: string;
    city?: string;
    postal_code?: string;
    country?: string;
    is_default?: boolean;
  }) {
    return this.request(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(address)
    });
  }

  async deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, { method: 'DELETE' });
  }

  async setDefaultAddress(id: string) {
    return this.request(`/addresses/${id}/default`, { method: 'POST' });
  }

  // ADMIN LISTING APPROVAL - Yeni eklenen metotlar
  async getAdminPendingListings() {
    return this.request('/admin/listings/pending');
  }

  async approveListing(listingId: string) {
    return this.request(`/admin/listings/approve/${listingId}`, {
      method: 'POST'
    });
  }

  async rejectListing(listingId: string, reason: string) {
    return this.request(`/admin/listings/reject/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAdminApprovedListings() {
    return this.request('/admin/listings/approved');
  }

  async getAdminRejectedListings() {
    return this.request('/admin/listings/rejected');
  }

  // ADMIN OFFERS - Teklif yönetimi
  async getAdminOffers(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const url = `/admin/offers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return this.request(url);
  }

  async getAdminOfferDetail(offerId: string) {
    return this.request(`/admin/offers/${offerId}`);
  }

  async updateOfferStatusAsAdmin(offerId: string, status: string, reason?: string) {
    return this.request(`/admin/offers/${offerId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason })
    });
  }

  async deleteOfferAsAdmin(offerId: string) {
    return this.request(`/admin/offers/${offerId}`, {
      method: 'DELETE'
    });
  }

  // ADMIN OFFER APPROVAL - Teklif onay sistemi
  async getPendingOffers() {
    return this.request('/admin/pending-offers');
  }

  async approveOfferAsAdmin(offerId: string) {
    return this.request(`/admin/offers/${offerId}/approve`, {
      method: 'POST'
    });
  }

  async rejectOfferAsAdmin(offerId: string, reason: string) {
    return this.request(`/admin/offers/${offerId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async getAdminApprovedOffers() {
    return this.request('/admin/offers/approved');
  }

  async getAdminRejectedOffers() {
    return this.request('/admin/offers/rejected');
  }

  // LISTING COMMENTS
  async getListingComments(listingId: string) {
    return this.request(`/comments/listing/${listingId}`);
  }

  async getListingCommentCount(listingId: string) {
    return this.request(`/comments/listing/${listingId}/count`);
  }

  async addListingComment(listingId: string, comment: string) {
    return this.request(`/comments/listing/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
  }

  async replyToComment(commentId: string, reply: string) {
    return this.request(`/comments/reply/${commentId}`, {
      method: 'POST',
      body: JSON.stringify({ reply })
    });
  }

  async getPendingComments(listingId: string) {
    return this.request(`/comments/listing/${listingId}/pending`);
  }

  // Commission methods
  async getCommissionBalance() {
    return this.request('/commission/balance');
  }

  async getCommissionHistory(limit = 50, offset = 0) {
    return this.request(`/commission/history?limit=${limit}&offset=${offset}`);
  }

  async getCommissionWithdrawals() {
    return this.request('/commission/withdrawals');
  }

  async requestCommissionWithdrawal(data: { amount: number; bankName: string; iban: string; accountHolderName: string }) {
    return this.request('/commission/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCommissionSettings() {
    return this.request('/commission/settings');
  }

  // IBAN methods
  async getIbans() {
    return this.request('/ibans');
  }

  async addIban(data: { title: string; bankName: string; iban: string; accountHolderName: string; isDefault?: boolean }) {
    return this.request('/ibans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async setDefaultIban(id: string) {
    return this.request(`/ibans/${id}/default`, { method: 'PATCH' });
  }

  async deleteIban(id: string) {
    return this.request(`/ibans/${id}`, { method: 'DELETE' });
  }

  // Seller Profile methods
  async getMySellerProfile() {
    return this.request('/seller-profile/my-profile');
  }

  async getSellerProfile(userId: string) {
    return this.request(`/seller-profile/profile/${userId}`);
  }

  async createOrUpdateSellerProfile(profileData: any) {
    return this.request('/seller-profile/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }

  async deleteSellerProfile() {
    return this.request('/seller-profile/profile', {
      method: 'DELETE'
    });
  }

  async canMakeOffer() {
    return this.request('/seller-profile/can-make-offer');
  }

  // Admin Seller Profile methods
  async getAdminSellerProfiles(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/admin/seller-profiles${query}`);
  }

  async getAdminSellerProfile(profileId: string) {
    return this.request(`/admin/seller-profiles/${profileId}`);
  }

  async approveSellerProfile(profileId: string) {
    return this.request(`/admin/seller-profiles/${profileId}/approve`, {
      method: 'POST'
    });
  }

  async rejectSellerProfile(profileId: string, reason: string) {
    return this.request(`/admin/seller-profiles/${profileId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async suspendSellerProfile(profileId: string, reason: string) {
    return this.request(`/admin/seller-profiles/${profileId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async unsuspendSellerProfile(profileId: string) {
    return this.request(`/admin/seller-profiles/${profileId}/unsuspend`, {
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
export const register = (email: string, password: string, firstName: string, lastName: string, city?: string | null, phone?: string | null, gender?: string | null, addressLine1?: string | null, district?: string | null, postalCode?: string | null) => mysqlAPI.register(email, password, firstName, lastName, city, phone, gender, addressLine1, district, postalCode);
export const logout = () => mysqlAPI.logout();

export default mysqlAPI;