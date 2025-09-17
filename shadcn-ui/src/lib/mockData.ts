// Mock data and localStorage management for the reverse marketplace

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'both';
  avatar?: string;
  city: string;
  rating: number;
  reviewCount: number;
}

export interface Listing {
  id: string;
  buyerId: string;
  buyerName: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  deliveryType: 'shipping' | 'pickup' | 'both';
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  expiresAt: string;
  offerCount: number;
}

export interface Offer {
  id: string;
  listingId: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  price: number;
  condition: 'new' | 'used';
  brand?: string;
  model?: string;
  description: string;
  deliveryType: 'shipping' | 'pickup';
  shippingCost: number;
  etaDays: number;
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  validUntil: string;
}

export interface Message {
  id: string;
  listingId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// Categories
export const categories = [
  'Elektronik',
  'Ev & Yaşam',
  'Moda & Aksesuar',
  'Spor & Outdoor',
  'Kitap & Müzik',
  'Oyuncak & Hobi',
  'Otomotiv',
  'Diğer'
];

// Turkish cities (sample)
export const cities = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 
  'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Urfa', 'Malatya', 'Erzurum', 'Trabzon'
];

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    role: 'buyer',
    city: 'İstanbul',
    rating: 4.8,
    reviewCount: 23
  },
  {
    id: '2',
    name: 'Ayşe Demir',
    email: 'ayse@example.com',
    role: 'seller',
    city: 'Ankara',
    rating: 4.9,
    reviewCount: 156
  },
  {
    id: '3',
    name: 'Mehmet Kaya',
    email: 'mehmet@example.com',
    role: 'both',
    city: 'İzmir',
    rating: 4.7,
    reviewCount: 89
  }
];

const mockListings: Listing[] = [
  {
    id: '1',
    buyerId: '1',
    buyerName: 'Ahmet Yılmaz',
    title: 'iPhone 15 Pro Max Aranıyor',
    description: 'Yeni veya az kullanılmış iPhone 15 Pro Max arıyorum. Tercihen 256GB veya üzeri. Kutu ve aksesuarları olması tercih sebebi.',
    category: 'Elektronik',
    budgetMin: 45000,
    budgetMax: 55000,
    condition: 'any',
    city: 'İstanbul',
    deliveryType: 'both',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    offerCount: 3
  },
  {
    id: '2',
    buyerId: '3',
    buyerName: 'Mehmet Kaya',
    title: 'Saç Kurutma Makinesi',
    description: 'Profesyonel saç kurutma makinesi arıyorum. Philips, Braun veya Dyson marka tercihim var. İyonik teknoloji olması önemli.',
    category: 'Ev & Yaşam',
    budgetMin: 800,
    budgetMax: 2500,
    condition: 'any',
    city: 'İzmir',
    deliveryType: 'shipping',
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    offerCount: 1
  },
  {
    id: '3',
    buyerId: '1',
    buyerName: 'Ahmet Yılmaz',
    title: 'Gaming Laptop',
    description: 'Oyun oynayabileceğim güçlü bir laptop arıyorum. RTX 4060 veya üzeri ekran kartı, 16GB RAM minimum. ASUS ROG veya MSI tercih ederim.',
    category: 'Elektronik',
    budgetMin: 25000,
    budgetMax: 40000,
    condition: 'new',
    city: 'İstanbul',
    deliveryType: 'both',
    status: 'active',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    offerCount: 5
  }
];

const mockOffers: Offer[] = [
  {
    id: '1',
    listingId: '1',
    sellerId: '2',
    sellerName: 'Ayşe Demir',
    sellerRating: 4.9,
    price: 52000,
    condition: 'new',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max 256GB',
    description: 'Sıfır kutusunda iPhone 15 Pro Max. Fatura ve garantisi mevcut. Tüm aksesuarları eksiksiz.',
    deliveryType: 'both',
    shippingCost: 0,
    etaDays: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    listingId: '1',
    sellerId: '3',
    sellerName: 'Mehmet Kaya',
    sellerRating: 4.7,
    price: 48000,
    condition: 'used',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max 256GB',
    description: '2 aylık kullanılmış, hiç düşmemiş. Ekran koruyucu ve kılıf ile kullanıldı. Kutu ve şarj aleti mevcut.',
    deliveryType: 'shipping',
    shippingCost: 25,
    etaDays: 2,
    status: 'active',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    listingId: '2',
    sellerId: '2',
    sellerName: 'Ayşe Demir',
    sellerRating: 4.9,
    price: 1200,
    condition: 'new',
    brand: 'Philips',
    model: 'DryCare Prestige BHD970',
    description: 'Sıfır kutusunda Philips profesyonel saç kurutma makinesi. İyonik teknoloji, 3 hız 6 sıcaklık ayarı.',
    deliveryType: 'shipping',
    shippingCost: 15,
    etaDays: 1,
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    validUntil: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const mockMessages: Message[] = [
  {
    id: '1',
    listingId: '1',
    fromUserId: '1',
    fromUserName: 'Ahmet Yılmaz',
    toUserId: '2',
    message: 'Merhaba, iPhone\'un garantisi ne kadar süreli?',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: true
  },
  {
    id: '2',
    listingId: '1',
    fromUserId: '2',
    fromUserName: 'Ayşe Demir',
    toUserId: '1',
    message: 'Merhaba! Apple Türkiye garantisi var, 2 yıl süreli. Fatura da mevcut.',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    read: false
  }
];

// LocalStorage management
const STORAGE_KEYS = {
  LISTINGS: 'marketplace_listings',
  OFFERS: 'marketplace_offers',
  USERS: 'marketplace_users',
  CURRENT_USER: 'marketplace_current_user',
  MESSAGES: 'marketplace_messages'
};

export class DataManager {
  static initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.LISTINGS)) {
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(mockListings));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFERS)) {
      localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(mockOffers));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mockUsers));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(mockMessages));
    }
    // Don't auto-login, let user choose
  }

  static getListings(): Listing[] {
    const data = localStorage.getItem(STORAGE_KEYS.LISTINGS);
    return data ? JSON.parse(data) : [];
  }

  static addListing(listing: Omit<Listing, 'id' | 'createdAt' | 'offerCount'>): Listing {
    const listings = this.getListings();
    const newListing: Listing = {
      ...listing,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      offerCount: 0
    };
    listings.unshift(newListing);
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    return newListing;
  }

  static getOffers(listingId?: string): Offer[] {
    const data = localStorage.getItem(STORAGE_KEYS.OFFERS);
    const offers = data ? JSON.parse(data) : [];
    return listingId ? offers.filter((offer: Offer) => offer.listingId === listingId) : offers;
  }

  static addOffer(offer: Omit<Offer, 'id' | 'createdAt'>): Offer {
    const offers = this.getOffers();
    const listings = this.getListings();
    
    const newOffer: Offer = {
      ...offer,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    
    offers.push(newOffer);
    localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(offers));
    
    // Update offer count in listing
    const updatedListings = listings.map(listing => 
      listing.id === offer.listingId 
        ? { ...listing, offerCount: listing.offerCount + 1 }
        : listing
    );
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(updatedListings));
    
    return newOffer;
  }

  static getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  static getUser(id: string): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    return users.find((user: User) => user.id === id) || null;
  }

  static loginUser(email: string, password: string): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    
    // Mock password check - in real app, this would be hashed
    const user = users.find((u: User) => u.email === email);
    if (user && password === '123456') { // Demo password for all users
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  }

  static registerUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'buyer' | 'seller' | 'both';
    city: string;
  }): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [];
    
    // Check if email already exists
    if (users.find((u: User) => u.email === userData.email)) {
      return null;
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      city: userData.city,
      rating: 5.0,
      reviewCount: 0
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    
    return newUser;
  }

  static logoutUser(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // Message functions
  static getAllMessages(): Message[] {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  }

  static getMessages(listingId: string, userId1: string, userId2: string): Message[] {
    const messages = this.getAllMessages();
    
    return messages.filter((msg: Message) => 
      msg.listingId === listingId &&
      ((msg.fromUserId === userId1 && msg.toUserId === userId2) ||
       (msg.fromUserId === userId2 && msg.toUserId === userId1))
    ).sort((a: Message, b: Message) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
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
      id: Date.now().toString(),
      ...messageData,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    messages.push(newMessage);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    
    return newMessage;
  }

  static markMessagesAsRead(listingId: string, currentUserId: string, otherUserId: string): void {
    const messages = this.getAllMessages();
    
    const updatedMessages = messages.map((msg: Message) => {
      if (msg.listingId === listingId && 
          msg.fromUserId === otherUserId && 
          msg.toUserId === currentUserId) {
        return { ...msg, read: true };
      }
      return msg;
    });
    
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
  }

  static searchListings(query: string, filters: {
    category?: string;
    city?: string;
    budgetMax?: number;
    condition?: string;
  } = {}): Listing[] {
    let listings = this.getListings().filter(listing => listing.status === 'active');
    
    if (query) {
      const searchTerm = query.toLowerCase();
      listings = listings.filter(listing => 
        listing.title.toLowerCase().includes(searchTerm) ||
        listing.description.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.category && filters.category !== 'all') {
      listings = listings.filter(listing => listing.category === filters.category);
    }
    
    if (filters.city && filters.city !== 'all') {
      listings = listings.filter(listing => listing.city === filters.city);
    }
    
    if (filters.budgetMax) {
      listings = listings.filter(listing => listing.budgetMin <= filters.budgetMax!);
    }
    
    if (filters.condition && filters.condition !== 'all') {
      listings = listings.filter(listing => 
        listing.condition === filters.condition || listing.condition === 'any'
      );
    }
    
    return listings;
  }

  static formatPrice(price: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  static formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(dateString));
  }

  static getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return this.formatDate(dateString);
  }
}

// Initialize data on module load
DataManager.initializeData();