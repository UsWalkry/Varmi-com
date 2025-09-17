// Mock data and localStorage management
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'both';
  city: string;
  rating: number;
  reviewCount: number;
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
  message: string;
  read: boolean;
  createdAt: string;
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

// Mock data
const mockUsers: User[] = [
  {
    id: 'user1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    role: 'both',
    city: 'İstanbul',
    rating: 4.8,
    reviewCount: 23,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'user2',
    name: 'Ayşe Demir',
    email: 'ayse@example.com',
    role: 'seller',
    city: 'Ankara',
    rating: 4.9,
    reviewCount: 45,
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'user3',
    name: 'Mehmet Kaya',
    email: 'mehmet@example.com',
    role: 'buyer',
    city: 'İzmir',
    rating: 4.7,
    reviewCount: 12,
    createdAt: '2024-01-20T10:00:00Z'
  }
];

const mockListings: Listing[] = [
  {
    id: 'listing1',
    title: 'iPhone 15 Pro Max Aranıyor',
    description: 'Temiz, hasarsız iPhone 15 Pro Max arıyorum. Tercihen kutu ve aksesuarları ile birlikte olsun.',
    category: 'Elektronik',
    budgetMin: 45000,
    budgetMax: 55000,
    condition: 'used',
    city: 'İstanbul',
    deliveryType: 'both',
    buyerId: 'user1',
    buyerName: 'Ahmet Yılmaz',
    status: 'active',
    createdAt: '2024-01-25T14:30:00Z',
    offerCount: 3
  },
  {
    id: 'listing2',
    title: 'MacBook Air M2 İhtiyacım Var',
    description: 'Grafik tasarım işleri için MacBook Air M2 arıyorum. 256GB veya 512GB olabilir.',
    category: 'Elektronik',
    budgetMin: 25000,
    budgetMax: 35000,
    condition: 'any',
    city: 'Ankara',
    deliveryType: 'shipping',
    buyerId: 'user3',
    buyerName: 'Mehmet Kaya',
    status: 'active',
    createdAt: '2024-01-24T09:15:00Z',
    offerCount: 5
  },
  {
    id: 'listing3',
    title: 'Vintage Deri Ceket Arıyorum',
    description: 'Erkek vintage deri ceket arıyorum. L veya XL beden olsun.',
    category: 'Moda & Giyim',
    budgetMin: 800,
    budgetMax: 1500,
    condition: 'used',
    city: 'İzmir',
    deliveryType: 'pickup',
    buyerId: 'user2',
    buyerName: 'Ayşe Demir',
    status: 'active',
    createdAt: '2024-01-23T16:45:00Z',
    offerCount: 2
  },
  {
    id: 'listing4',
    title: 'Gaming Klavye ve Mouse Set',
    description: 'RGB aydınlatmalı gaming klavye ve mouse seti arıyorum. Mechanical switch tercihim.',
    category: 'Elektronik',
    budgetMin: 1000,
    budgetMax: 2500,
    condition: 'new',
    city: 'Bursa',
    deliveryType: 'both',
    buyerId: 'user1',
    buyerName: 'Ahmet Yılmaz',
    status: 'active',
    createdAt: '2024-01-22T11:20:00Z',
    offerCount: 1
  }
];

const mockOffers: Offer[] = [
  {
    id: 'offer1',
    listingId: 'listing1',
    sellerId: 'user2',
    sellerName: 'Ayşe Demir',
    sellerRating: 4.9,
    price: 48000,
    message: 'Merhaba, iPhone 15 Pro Max 256GB modelim var. Kutu ve tüm aksesuarları mevcut. Fotoğrafları gönderebilirim.',
    status: 'pending',
    createdAt: '2024-01-25T15:30:00Z'
  },
  {
    id: 'offer2',
    listingId: 'listing2',
    sellerId: 'user2',
    sellerName: 'Ayşe Demir',
    sellerRating: 4.9,
    price: 28000,
    message: 'MacBook Air M2 512GB modelim var. 6 aylık, garantisi devam ediyor.',
    status: 'pending',
    createdAt: '2024-01-24T10:15:00Z'
  }
];

const mockMessages: Message[] = [
  {
    id: 'msg1',
    listingId: 'listing1',
    fromUserId: 'user2',
    fromUserName: 'Ayşe Demir',
    toUserId: 'user1',
    message: 'Merhaba, iPhone teklifiniz hakkında konuşabilir miyiz?',
    read: false,
    createdAt: '2024-01-25T16:00:00Z'
  },
  {
    id: 'msg2',
    listingId: 'listing1',
    fromUserId: 'user1',
    fromUserName: 'Ahmet Yılmaz',
    toUserId: 'user2',
    message: 'Tabii ki! Telefon hangi renk ve kaç GB?',
    read: true,
    createdAt: '2024-01-25T16:05:00Z'
  }
];

// DataManager class with all static methods
export class DataManager {
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
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.LISTINGS)) {
      localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(mockListings));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.OFFERS)) {
      localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(mockOffers));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(mockMessages));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.FAVORITES)) {
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify({}));
    }
  }

  // User management
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.STORAGE_KEYS.CURRENT_USER);
    return userStr ? JSON.parse(userStr) : null;
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
      rating: 5.0,
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

  static searchListings(query: string = '', filters: any = {}): Listing[] {
    let listings = this.getListings();

    // Text search
    if (query) {
      listings = listings.filter(listing =>
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        listing.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply filters
    if (filters.category) {
      listings = listings.filter(listing => listing.category === filters.category);
    }
    if (filters.city) {
      listings = listings.filter(listing => listing.city === filters.city);
    }
    if (filters.budgetMax) {
      listings = listings.filter(listing => listing.budgetMin <= filters.budgetMax);
    }
    if (filters.condition) {
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
  static getOffers(listingId?: string): Offer[] {
    this.initializeData();
    const offersStr = localStorage.getItem(this.STORAGE_KEYS.OFFERS);
    const offers = offersStr ? JSON.parse(offersStr) : [];
    return listingId ? offers.filter((offer: Offer) => offer.listingId === listingId) : offers;
  }

  static getAllOffers(): Offer[] {
    return this.getOffers();
  }

  static getOffersForListing(listingId: string): Offer[] {
    return this.getOffers(listingId);
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
  static getAllMessages(): Message[] {
    this.initializeData();
    const messagesStr = localStorage.getItem(this.STORAGE_KEYS.MESSAGES);
    return messagesStr ? JSON.parse(messagesStr) : [];
  }

  static getMessages(listingId: string, userId1: string, userId2: string): Message[] {
    const messages = this.getAllMessages();
    return messages.filter(msg =>
      msg.listingId === listingId &&
      ((msg.fromUserId === userId1 && msg.toUserId === userId2) ||
       (msg.fromUserId === userId2 && msg.toUserId === userId1))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
      ...messageData,
      read: false,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    return newMessage;
  }

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