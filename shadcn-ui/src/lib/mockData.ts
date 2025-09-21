export interface Review {
  id: string;
  fromUserId: string;
  toUserId: string;
  listingId: string;
  offerId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}
// Mock data and localStorage management
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'both';
  city: string;
  rating: number;
  reviewCount: number;
  averageRating?: number;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  deliveryType: 'shipping' | 'pickup' | 'both';
  buyerId: string;
  buyerName: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  offerCount: number;
  expiresAt?: string;
}

export interface Offer {
  id: string;
  listingId: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  price: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Message {
  id: string;
  listingId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface SearchFilters {
  category?: string;
  city?: string;
  budgetMax?: number;
  condition?: string;
}

// Categories and cities
export const categories = [
  'Elektronik',
  'Moda & Giyim',
  'Ev & Yaşam',
  'Spor & Outdoor',
  'Kitap & Müzik',
  'Otomobil',
  'Emlak',
  'İş & Sanayi',
  'Diğer'
];

export const cities = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Gaziantep',
  'Mersin',
  'Diyarbakır'
];

// Seed data removed: start with an empty application (no demo users, listings, offers, or messages)
const mockUsers: User[] = [];
const mockListings: Listing[] = [];
const mockOffers: Offer[] = [];
const mockMessages: Message[] = [];

// DataManager class with all static methods
export class DataManager {
  // Mesaj yönetimi
  // Sadece aşağıdaki versiyonlar kalacak
  static getAllMessages(): Message[] {
    this.initializeData();
    const messagesStr = localStorage.getItem(this.STORAGE_KEYS.MESSAGES);
    return messagesStr ? JSON.parse(messagesStr) : [];
  }

  static addMessage(messageData: {
    listingId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    message: string;
  }): Message {
    const messages = this.getAllMessages();
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      listingId: messageData.listingId,
      fromUserId: messageData.fromUserId,
      fromUserName: messageData.fromUserName,
      toUserId: messageData.toUserId,
      content: messageData.message,
      read: false,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    return newMessage;
  }

  static getConversation(userA: string, userB: string, listingId?: string): Message[] {
    return this.getAllMessages().filter(m =>
      ((m.fromUserId === userA && m.toUserId === userB) || (m.fromUserId === userB && m.toUserId === userA)) &&
      (listingId ? m.listingId === listingId : true)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  // Review management
  static addReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
    const reviews = this.getAllReviews();
    const newReview: Review = {
      ...review,
      id: `review_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    reviews.push(newReview);
    localStorage.setItem('reviews', JSON.stringify(reviews));
    return newReview;
  }

  static getAllReviews(): Review[] {
    const reviewsStr = localStorage.getItem('reviews');
    return reviewsStr ? JSON.parse(reviewsStr) : [];
  }

  static getUserReviews(userId: string): Review[] {
    return this.getAllReviews().filter(r => r.toUserId === userId);
  }

  static getUserAverageRating(userId: string): number {
    const reviews = this.getUserReviews(userId);
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  static getUserReviewCount(userId: string): number {
    return this.getUserReviews(userId).length;
  }
  static updateListing(id: string, updatedFields: Partial<Listing>): Listing | undefined {
    const listings = this.getListings();
    const idx = listings.findIndex(l => l.id === id);
    if (idx === -1) return undefined;
    listings[idx] = { ...listings[idx], ...updatedFields };
    localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    return listings[idx];
  }
  private static STORAGE_KEYS = {
    CURRENT_USER: 'currentUser',
    USERS: 'users',
    LISTINGS: 'listings',
    OFFERS: 'offers',
    MESSAGES: 'messages',
    FAVORITES: 'favorites'
  };

  // Initialize data if not exists
  static initializeData() {
    if (!localStorage.getItem(this.STORAGE_KEYS.USERS)) {
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.LISTINGS)) {
      localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.OFFERS)) {
      localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.FAVORITES)) {
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify({}));
    }
  }

  // Optional helper to purge all app data (useful after removing demo content)
  static resetAllData() {
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(null));
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify({}));
    localStorage.setItem('reviews', JSON.stringify([]));
  }

  // User management
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
    const stored = userStr ? (JSON.parse(userStr) as User | null) : null;
    if (!stored) return null;
    // Validate against current users list (prevents stale demo accounts)
    const users = this.getUsers();
    const exists = users.find(u => u.id === stored.id);
    if (!exists) {
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
      return null;
    }
    return exists;
  }

  static login(email: string, password: string): User | null {
    this.initializeData();
    const users = this.getUsers();
    
    // Demo için basit doğrulama - gerçek uygulamada hash kontrolü olacak
    const user = users.find(u => u.email === email);
    if (user && (password === '123456' || password === '')) {
      localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  static loginUser(email: string, password: string): User | null {
    return this.login(email, password);
  }

  static registerUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'buyer' | 'seller' | 'both';
    city: string;
  }): User | null {
    this.initializeData();
    const users = this.getUsers();
    
    // Check if email already exists
    if (users.find(u => u.email === userData.email)) {
      return null;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      city: userData.city,
      rating: 0,
      averageRating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    
    return newUser;
  }

  static logout() {
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
  }

  static logoutUser() {
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
  }

  static getUsers(): User[] {
    this.initializeData();
    const usersStr = localStorage.getItem(this.STORAGE_KEYS.USERS);
    return usersStr ? JSON.parse(usersStr) : [];
  }

  static getUser(userId: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.id === userId);
  }

  // Listings management
  static getListings(): Listing[] {
    this.initializeData();
    const listingsStr = localStorage.getItem(this.STORAGE_KEYS.LISTINGS);
    return listingsStr ? JSON.parse(listingsStr) : [];
  }

  static getListing(id: string): Listing | undefined {
    const listings = this.getListings();
    return listings.find(l => l.id === id);
  }

  static searchListings(query: string = '', filters: SearchFilters = {}): Listing[] {
    let listings = this.getListings();

    // Text search
    if (query) {
      listings = listings.filter(listing =>
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        listing.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply filters
    if (filters.category && filters.category !== 'all') {
      listings = listings.filter(listing => listing.category === filters.category);
    }
    if (filters.city && filters.city !== 'all') {
      listings = listings.filter(listing => listing.city === filters.city);
    }
    if (filters.budgetMax) {
      listings = listings.filter(listing => listing.budgetMin <= filters.budgetMax);
    }
    if (filters.condition && filters.condition !== 'all') {
      listings = listings.filter(listing => listing.condition === filters.condition);
    }

    return listings;
  }

  static addListing(listing: Omit<Listing, 'id' | 'createdAt' | 'offerCount'>): Listing {
    const listings = this.getListings();
    const newListing: Listing = {
      ...listing,
      id: `listing_${Date.now()}`,
      createdAt: new Date().toISOString(),
      offerCount: 0
    };
    listings.push(newListing);
    localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    return newListing;
  }

  // Offers management
  static getOffers(): Offer[] {
    this.initializeData();
    const offersStr = localStorage.getItem(this.STORAGE_KEYS.OFFERS);
    return offersStr ? JSON.parse(offersStr) : [];
  }

  static getAllOffers(): Offer[] {
    return this.getOffers();
  }

  static getOffersForListing(listingId: string): Offer[] {
    const offers = this.getOffers();
    return offers.filter(offer => offer.listingId === listingId);
  }

  static addOffer(offer: Omit<Offer, 'id' | 'createdAt'>): Offer {
    const offers = this.getOffers();
    const newOffer: Offer = {
      ...offer,
      id: `offer_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    offers.push(newOffer);
    localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));

    // Update listing offer count
    const listings = this.getListings();
    const listingIndex = listings.findIndex(l => l.id === offer.listingId);
    if (listingIndex !== -1) {
      listings[listingIndex].offerCount = (listings[listingIndex].offerCount || 0) + 1;
      localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    }

    return newOffer;
  }

  static acceptOffer(offerId: string): boolean {
    const offers = this.getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
      offers[offerIndex].status = 'accepted';
      localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));
      return true;
    }
    return false;
  }

  static rejectOffer(offerId: string): boolean {
    const offers = this.getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
      offers[offerIndex].status = 'rejected';
      localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));
      return true;
    }
    return false;
  }

  // Messages management

  static markMessagesAsRead(listingId: string, currentUserId: string, otherUserId: string) {
    const messages = this.getAllMessages();
    let updated = false;
    
    messages.forEach(msg => {
      if (msg.listingId === listingId && 
          msg.fromUserId === otherUserId && 
          msg.toUserId === currentUserId && 
          !msg.read) {
        msg.read = true;
        updated = true;
      }
    });
    
    if (updated) {
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    }
  }

  static getUnreadMessageCount(userId: string): number {
    const messages = this.getAllMessages();
    return messages.filter(msg => msg.toUserId === userId && !msg.read).length;
  }

  // Favorites management
  static getFavorites(userId: string): string[] {
    this.initializeData();
    const favoritesStr = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
    const favorites = favoritesStr ? JSON.parse(favoritesStr) : {};
    return favorites[userId] || [];
  }

  static addToFavorites(userId: string, listingId: string) {
    const favoritesStr = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
    const favorites = favoritesStr ? JSON.parse(favoritesStr) : {};
    
    if (!favorites[userId]) {
      favorites[userId] = [];
    }
    
    if (!favorites[userId].includes(listingId)) {
      favorites[userId].push(listingId);
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  }

  static removeFromFavorites(userId: string, listingId: string): boolean {
    const favoritesStr = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
    const favorites = favoritesStr ? JSON.parse(favoritesStr) : {};
    
    if (favorites[userId]) {
      const index = favorites[userId].indexOf(listingId);
      if (index > -1) {
        favorites[userId].splice(index, 1);
        localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        return true;
      }
    }
    return false;
  }

  static isFavorite(userId: string, listingId: string): boolean {
    const userFavorites = this.getFavorites(userId);
    return userFavorites.includes(listingId);
  }

  static getUserFavoriteListings(userId: string): Listing[] {
    const favoriteIds = this.getFavorites(userId);
    const allListings = this.getListings();
    return allListings.filter(listing => favoriteIds.includes(listing.id));
  }

  // Utility functions
  static formatPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  static formatDate(input: string | Date, locale = 'tr-TR'): string {
    try {
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  static getTimeAgo(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return 'Az önce';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} dakika önce`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} saat önce`;
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} gün önce`;
      } else {
        return this.formatDate(dateString);
      }
    } catch {
      return '';
    }
  }
}

// Initialize data on import
DataManager.initializeData();