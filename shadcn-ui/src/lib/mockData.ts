// Mock Data Manager for the reverse marketplace platform

export interface User {
  id: string;
  name: string;
  email: string;
  city: string;
  rating: number;
  reviewCount: number;
  role: 'buyer' | 'seller' | 'both';
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: 'new' | 'used' | 'any';
  budgetMin: number;
  budgetMax: number;
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

export interface Favorite {
  userId: string;
  listingId: string;
  createdAt: string;
}

// Categories and Cities
export const categories = [
  'Elektronik',
  'Ev & Yaşam',
  'Moda & Aksesuar',
  'Spor & Outdoor',
  'Otomobil',
  'Emlak',
  'İş Makineleri',
  'Hobi & Oyun',
  'Kitap & Dergi',
  'Müzik & Film'
];

export const cities = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Şanlıurfa',
  'Gaziantep',
  'Kocaeli'
];

class MockDataManager {
  private currentUser: User | null = null;

  // Initialize with sample data
  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize users if not exists
    if (!localStorage.getItem('users')) {
      const users: User[] = [
        {
          id: 'user1',
          name: 'Ahmet Yılmaz',
          email: 'ahmet@example.com',
          city: 'İstanbul',
          rating: 4.8,
          reviewCount: 25,
          role: 'both',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user2',
          name: 'Ayşe Demir',
          email: 'ayse@example.com',
          city: 'Ankara',
          rating: 4.9,
          reviewCount: 18,
          role: 'seller',
          createdAt: new Date().toISOString()
        },
        {
          id: 'user3',
          name: 'Mehmet Kaya',
          email: 'mehmet@example.com',
          city: 'İzmir',
          rating: 4.7,
          reviewCount: 32,
          role: 'buyer',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('users', JSON.stringify(users));
    }

    // Initialize listings if not exists
    if (!localStorage.getItem('listings')) {
      const listings: Listing[] = [
        {
          id: 'listing1',
          title: 'iPhone 15 Pro Max Aranıyor',
          description: 'Temiz, hasarsız iPhone 15 Pro Max arıyorum. Tercihen siyah renk olsun.',
          category: 'Elektronik',
          condition: 'used',
          budgetMin: 45000,
          budgetMax: 55000,
          city: 'İstanbul',
          deliveryType: 'both',
          buyerId: 'user1',
          buyerName: 'Ahmet Yılmaz',
          status: 'active',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          offerCount: 3
        },
        {
          id: 'listing2',
          title: 'MacBook Air M2 İhtiyacım Var',
          description: 'Grafik tasarım için MacBook Air M2 arıyorum. 8GB RAM yeterli.',
          category: 'Elektronik',
          condition: 'any',
          budgetMin: 25000,
          budgetMax: 35000,
          city: 'Ankara',
          deliveryType: 'shipping',
          buyerId: 'user3',
          buyerName: 'Mehmet Kaya',
          status: 'active',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          offerCount: 1
        },
        {
          id: 'listing3',
          title: 'Gaming Klavye ve Mouse Set',
          description: 'RGB ışıklı gaming klavye ve mouse seti arıyorum. Mekanik klavye tercihen.',
          category: 'Elektronik',
          condition: 'new',
          budgetMin: 1500,
          budgetMax: 3000,
          city: 'İzmir',
          deliveryType: 'both',
          buyerId: 'user1',
          buyerName: 'Ahmet Yılmaz',
          status: 'active',
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          offerCount: 2
        }
      ];
      localStorage.setItem('listings', JSON.stringify(listings));
    }

    // Initialize offers if not exists
    if (!localStorage.getItem('offers')) {
      const offers: Offer[] = [
        {
          id: 'offer1',
          listingId: 'listing1',
          sellerId: 'user2',
          sellerName: 'Ayşe Demir',
          sellerRating: 4.9,
          price: 52000,
          message: 'Sıfır ayarında iPhone 15 Pro Max var. Faturası mevcut.',
          status: 'pending',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ];
      localStorage.setItem('offers', JSON.stringify(offers));
    }

    // Initialize messages if not exists
    if (!localStorage.getItem('messages')) {
      const messages: Message[] = [
        {
          id: 'msg1',
          listingId: 'listing1',
          fromUserId: 'user2',
          fromUserName: 'Ayşe Demir',
          toUserId: 'user1',
          message: 'Merhaba, iPhone ilanınızı gördüm. Detayları konuşabilir miyiz?',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      localStorage.setItem('messages', JSON.stringify(messages));
    }

    // Initialize favorites if not exists
    if (!localStorage.getItem('favorites')) {
      const favorites: Favorite[] = [];
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    // Auto login user1 for demo
    this.currentUser = this.getUsers().find(u => u.id === 'user1') || null;
  }

  // User Management
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUsers(): User[] {
    return JSON.parse(localStorage.getItem('users') || '[]');
  }

  getUser(userId: string): User | undefined {
    return this.getUsers().find(u => u.id === userId);
  }

  login(email: string, password: string): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    if (user) {
      this.currentUser = user;
      return user;
    }
    return null;
  }

  logout(): void {
    this.currentUser = null;
  }

  logoutUser(): void {
    this.currentUser = null;
  }

  // Listing Management
  getListings(): Listing[] {
    return JSON.parse(localStorage.getItem('listings') || '[]');
  }

  getListing(id: string): Listing | undefined {
    return this.getListings().find(l => l.id === id);
  }

  createListing(listingData: Omit<Listing, 'id' | 'createdAt' | 'offerCount'>): Listing {
    const listings = this.getListings();
    const newListing: Listing = {
      ...listingData,
      id: `listing_${Date.now()}`,
      createdAt: new Date().toISOString(),
      offerCount: 0
    };
    listings.push(newListing);
    localStorage.setItem('listings', JSON.stringify(listings));
    return newListing;
  }

  searchListings(query: string = '', filters: any = {}): Listing[] {
    let listings = this.getListings();

    // Filter by search query
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

    if (filters.condition) {
      listings = listings.filter(listing => 
        listing.condition === filters.condition || listing.condition === 'any'
      );
    }

    if (filters.budgetMax) {
      listings = listings.filter(listing => listing.budgetMin <= filters.budgetMax);
    }

    return listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Offer Management
  getOffers(): Offer[] {
    return JSON.parse(localStorage.getItem('offers') || '[]');
  }

  getAllOffers(): Offer[] {
    return this.getOffers();
  }

  createOffer(offerData: Omit<Offer, 'id' | 'createdAt'>): Offer {
    const offers = this.getOffers();
    const newOffer: Offer = {
      ...offerData,
      id: `offer_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    offers.push(newOffer);
    localStorage.setItem('offers', JSON.stringify(offers));

    // Update listing offer count
    const listings = this.getListings();
    const listingIndex = listings.findIndex(l => l.id === offerData.listingId);
    if (listingIndex !== -1) {
      listings[listingIndex].offerCount = (listings[listingIndex].offerCount || 0) + 1;
      localStorage.setItem('listings', JSON.stringify(listings));
    }

    return newOffer;
  }

  acceptOffer(offerId: string): boolean {
    const offers = this.getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
      offers[offerIndex].status = 'accepted';
      localStorage.setItem('offers', JSON.stringify(offers));
      return true;
    }
    return false;
  }

  rejectOffer(offerId: string): boolean {
    const offers = this.getOffers();
    const offerIndex = offers.findIndex(o => o.id === offerId);
    if (offerIndex !== -1) {
      offers[offerIndex].status = 'rejected';
      localStorage.setItem('offers', JSON.stringify(offers));
      return true;
    }
    return false;
  }

  // Message Management
  getAllMessages(): Message[] {
    return JSON.parse(localStorage.getItem('messages') || '[]');
  }

  getMessages(listingId: string, userId1: string, userId2: string): Message[] {
    const messages = this.getAllMessages();
    return messages.filter(msg =>
      msg.listingId === listingId &&
      ((msg.fromUserId === userId1 && msg.toUserId === userId2) ||
       (msg.fromUserId === userId2 && msg.toUserId === userId1))
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addMessage(messageData: Omit<Message, 'id' | 'read' | 'createdAt'>): Message {
    const messages = this.getAllMessages();
    const newMessage: Message = {
      ...messageData,
      id: `msg_${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    localStorage.setItem('messages', JSON.stringify(messages));
    return newMessage;
  }

  markMessagesAsRead(listingId: string, currentUserId: string, otherUserId: string): void {
    const messages = this.getAllMessages();
    const updatedMessages = messages.map(msg => {
      if (msg.listingId === listingId &&
          msg.fromUserId === otherUserId &&
          msg.toUserId === currentUserId) {
        return { ...msg, read: true };
      }
      return msg;
    });
    localStorage.setItem('messages', JSON.stringify(updatedMessages));
  }

  getUnreadMessageCount(userId: string): number {
    const messages = this.getAllMessages();
    return messages.filter(msg => msg.toUserId === userId && !msg.read).length;
  }

  // Favorites Management
  getFavorites(userId: string): string[] {
    const favorites: Favorite[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.filter(f => f.userId === userId).map(f => f.listingId);
  }

  addToFavorites(userId: string, listingId: string): void {
    const favorites: Favorite[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    const exists = favorites.some(f => f.userId === userId && f.listingId === listingId);
    if (!exists) {
      favorites.push({
        userId,
        listingId,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
  }

  removeFromFavorites(userId: string, listingId: string): void {
    const favorites: Favorite[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    const filtered = favorites.filter(f => !(f.userId === userId && f.listingId === listingId));
    localStorage.setItem('favorites', JSON.stringify(filtered));
  }

  isFavorite(userId: string, listingId: string): boolean {
    const favorites = this.getFavorites(userId);
    return favorites.includes(listingId);
  }

  getUserFavoriteListings(userId: string): Listing[] {
    const favoriteIds = this.getFavorites(userId);
    const listings = this.getListings();
    return listings.filter(listing => favoriteIds.includes(listing.id));
  }

  // Utility Functions
  formatPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  getTimeAgo(dateString: string): string {
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
      return date.toLocaleDateString('tr-TR');
    }
  }
}

// Export singleton instance
export const DataManager = new MockDataManager();