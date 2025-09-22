// TOTP (RFC 6238) için tarayıcı uyumlu yardımcılar

// Browser-safe Base32 secret generator (RFC 4648, no padding)
function base32Encode(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output; // no '=' padding
}

function generateBase32Secret(byteLength = 20): string {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  const bytes = new Uint8Array(byteLength);
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    // Fallback (not cryptographically secure, demo only)
    for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return base32Encode(bytes);
}

// Base32 decode (RFC 4648)
function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function hmacSha1(keyBytes: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('WebCrypto not available');
  }
  const key = await cryptoObj.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await cryptoObj.subtle.sign('HMAC', key, msg);
  return new Uint8Array(sig);
}

async function generateTOTP(secretBase32: string, timeStep = 30, digits = 6, timestamp = Date.now()): Promise<string> {
  const key = base32Decode(secretBase32);
  // 8 baytlık big-endian counter değeri
  let counter = Math.floor((timestamp / 1000) / timeStep);
  const msg = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    msg[i] = counter & 0xff;
    counter = Math.floor(counter / 256);
  }
  const hash = await hmacSha1(key, msg);
  const offset = hash[hash.length - 1] & 0x0f;
  const binCode = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | (hash[offset + 3]);
  const mod = 10 ** digits;
  const otp = (binCode % mod).toString().padStart(digits, '0');
  return otp;
}

async function verifyTOTP(token: string, secretBase32: string, window = 1, timeStep = 30, digits = 6): Promise<boolean> {
  const now = Date.now();
  const checks: number[] = [];
  const stepMs = timeStep * 1000;
  for (let w = -window; w <= window; w++) {
    checks.push(now + w * stepMs);
  }
  const clean = (token || '').replace(/\D/g, '').slice(0, digits);
  for (const t of checks) {
    const code = await generateTOTP(secretBase32, timeStep, digits, t);
    if (code === clean) return true;
  }
  return false;
}

function buildOtpAuthURL(account: string, issuer: string, secret: string, digits = 6, period = 30, algorithm = 'SHA1') {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({ secret, issuer, digits: String(digits), period: String(period), algorithm });
  return `otpauth://totp/${label}?${params.toString()}`;
}

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
  city: string;
  rating: number;
  reviewCount: number;
  averageRating?: number;
  createdAt: string;
  // Optional profile fields
  username?: string;
  phone?: string;
  birthDate?: string; // YYYY-MM-DD
  avatarUrl?: string; // data URL or remote URL
  address?: {
    line1?: string;
    district?: string;
    postalCode?: string;
  };
  privacy?: {
    visibility: 'public' | 'friends' | 'private';
  };
  twoFactor?: {
    sms: boolean;
    authenticator: boolean;
    email: boolean;
    authenticatorSecret?: string;
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  recovery?: {
    backupEmail?: string;
    securityQuestion1?: string;
    securityAnswer1?: string;
    securityQuestion2?: string;
    securityAnswer2?: string;
  };
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  // İlan görselleri (data URL veya uzak URL). En az 1 önerilir.
  images?: string[];
  category: string;
  budgetMin: number;
  budgetMax: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  deliveryType: 'shipping' | 'pickup' | 'both';
  buyerId: string;
  buyerName: string;
  // İlan sahibi adını gizlemek için seçenek
  maskOwnerName?: boolean;
  // Teklif detaylarının herkese görünürlüğü (varsayılan: kapalı)
  offersPublic?: boolean;
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
  // Teklife eklenebilen görseller (max 5)
  images?: string[];
  // Optional details for richer offers
  condition?: 'new' | 'used';
  brand?: string;
  model?: string;
  description?: string;
  deliveryType?: 'shipping' | 'pickup';
  // Kargo için desi aralığı (yalnızca deliveryType = 'shipping' ise)
  shippingDesi?: DesiBracket;
  shippingCost?: number;
  etaDays?: number; // teslimat süresi gün
  status: 'active' | 'pending' | 'accepted' | 'rejected';
  validUntil?: string; // ISO, teklif geçerlilik tarihi
  message?: string; // backward compatibility
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
  // Elektronik & Teknoloji
  'Elektronik',
  'Telefon & Aksesuar',
  'Bilgisayar & Tablet',
  'TV, Görüntü & Ses',
  'Beyaz Eşya',
  'Foto & Kamera',
  'Oyun & Konsol',
  'Yazılım & Dijital Kod',
  // Ev & Yaşam
  'Ev & Yaşam',
  'Mobilya',
  'Ev Tekstili',
  'Aydınlatma',
  'Mutfak & Sofra',
  'Temizlik & Tüketim',
  // Moda & Kişisel Bakım
  'Giyim & Aksesuar',
  'Ayakkabı & Çanta',
  'Kozmetik & Kişisel Bakım',
  'Mücevher & Saat',
  // Anne, Bebek, Oyuncak
  'Anne & Bebek',
  'Hobi & Oyuncak',
  // Spor, Outdoor, Bahçe
  'Spor & Outdoor',
  'Kamp & Outdoor',
  'Bahçe & Yapı Market',
  // Kitap, Müzik, Film
  'Kitap & Müzik',
  'Müzik Enstrümanları',
  'Film & Oyun',
  // Otomotiv & Ulaşım
  'Otomobil',
  'Otomotiv Parça & Aksesuar',
  'Motosiklet',
  'Bisiklet & Scooter',
  // Emlak & İş
  'Emlak',
  'İş & Sanayi',
  'Ofis & Kırtasiye',
  // Özel ilgi alanları
  'Evcil Hayvan',
  'Koleksiyon & Antika',
  'Sağlık & Medikal',
  'Yiyecek & İçecek',
  'Eğitim & Kurs',
  'Seyahat & Bilet',
  'Diğer'
];

export const cities = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Amasya',
  'Ankara',
  'Antalya',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkâri',
  'Hatay',
  'Isparta',
  'Mersin',
  'İstanbul',
  'İzmir',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Kahramanmaraş',
  'Mardin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Rize',
  'Sakarya',
  'Samsun',
  'Siirt',
  'Sinop',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Şanlıurfa',
  'Uşak',
  'Van',
  'Yozgat',
  'Zonguldak',
  'Aksaray',
  'Bayburt',
  'Karaman',
  'Kırıkkale',
  'Batman',
  'Şırnak',
  'Bartın',
  'Ardahan',
  'Iğdır',
  'Yalova',
  'Karabük',
  'Kilis',
  'Osmaniye',
  'Düzce'
];

// Kategori bazlı minimum kar oranı kuralları (alt sınırlar)
type MarginRule = { max: number | null; percent: number }[];
const CATEGORY_MARGIN_RULES: Record<string, MarginRule | number> = {
  // Elektronik alt kategorileri (TL eşikleri)
  'Telefon & Aksesuar': [
    { max: 1500, percent: 0.12 },
    { max: 5000, percent: 0.09 },
    { max: 15000, percent: 0.07 },
    { max: 40000, percent: 0.05 },
    { max: null, percent: 0.035 },
  ],
  'Bilgisayar & Tablet': [
    { max: 1500, percent: 0.12 },
    { max: 5000, percent: 0.10 },
    { max: 15000, percent: 0.08 },
    { max: 40000, percent: 0.06 },
    { max: null, percent: 0.04 },
  ],
  'TV, Görüntü & Ses': [
    { max: 1500, percent: 0.11 },
    { max: 5000, percent: 0.09 },
    { max: 15000, percent: 0.07 },
    { max: 40000, percent: 0.05 },
    { max: null, percent: 0.035 },
  ],
  'Beyaz Eşya': [
    { max: 1500, percent: 0.10 },
    { max: 5000, percent: 0.08 },
    { max: 15000, percent: 0.06 },
    { max: 40000, percent: 0.05 },
    { max: null, percent: 0.035 },
  ],
  'Foto & Kamera': [
    { max: 1500, percent: 0.12 },
    { max: 5000, percent: 0.09 },
    { max: 15000, percent: 0.07 },
    { max: 40000, percent: 0.05 },
    { max: null, percent: 0.035 },
  ],
  'Oyun & Konsol': [
    { max: 1500, percent: 0.13 },
    { max: 5000, percent: 0.10 },
    { max: 15000, percent: 0.08 },
    { max: 40000, percent: 0.06 },
    { max: null, percent: 0.04 },
  ],
  'Yazılım & Dijital Kod': [
    { max: 1500, percent: 0.18 },
    { max: 5000, percent: 0.14 },
    { max: 15000, percent: 0.12 },
    { max: 40000, percent: 0.09 },
    { max: null, percent: 0.07 },
  ],
  // Ev & Yaşam
  'Mobilya': [
    { max: 500, percent: 0.28 },
    { max: 2500, percent: 0.22 },
    { max: 10000, percent: 0.16 },
    { max: null, percent: 0.12 },
  ],
  'Ev Tekstili': [
    { max: 500, percent: 0.32 },
    { max: 2500, percent: 0.26 },
    { max: 10000, percent: 0.20 },
    { max: null, percent: 0.16 },
  ],
  'Aydınlatma': [
    { max: 500, percent: 0.30 },
    { max: 2500, percent: 0.24 },
    { max: 10000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  'Mutfak & Sofra': [
    { max: 500, percent: 0.28 },
    { max: 2500, percent: 0.22 },
    { max: 10000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  'Temizlik & Tüketim': [
    { max: 500, percent: 0.22 },
    { max: 2500, percent: 0.18 },
    { max: 10000, percent: 0.14 },
    { max: null, percent: 0.12 },
  ],
  // Moda & Kişisel Bakım
  'Giyim & Aksesuar': [
    { max: 500, percent: 0.45 },
    { max: 1500, percent: 0.35 },
    { max: 5000, percent: 0.28 },
    { max: null, percent: 0.22 },
  ],
  'Ayakkabı & Çanta': [
    { max: 500, percent: 0.40 },
    { max: 1500, percent: 0.32 },
    { max: 5000, percent: 0.26 },
    { max: null, percent: 0.20 },
  ],
  'Kozmetik & Kişisel Bakım': [
    { max: 500, percent: 0.32 },
    { max: 1500, percent: 0.26 },
    { max: 5000, percent: 0.20 },
    { max: null, percent: 0.18 },
  ],
  'Mücevher & Saat': [
    { max: 500, percent: 0.28 },
    { max: 1500, percent: 0.22 },
    { max: 5000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  // Diğer gruplar
  'Anne & Bebek': [
    { max: 1000, percent: 0.26 },
    { max: 4000, percent: 0.20 },
    { max: null, percent: 0.16 },
  ],
  'Hobi & Oyuncak': [
    { max: 500, percent: 0.30 },
    { max: 2500, percent: 0.22 },
    { max: null, percent: 0.16 },
  ],
  'Spor & Outdoor': [
    { max: 1000, percent: 0.24 },
    { max: 5000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  'Bahçe & Yapı Market': [
    { max: 1500, percent: 0.28 },
    { max: 7500, percent: 0.20 },
    { max: null, percent: 0.15 },
  ],
  'Müzik Enstrümanları': [
    { max: 250, percent: 0.22 },
    { max: 1000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  'Film & Oyun': [
    { max: 250, percent: 0.18 },
    { max: 1000, percent: 0.14 },
    { max: null, percent: 0.12 },
  ],
  'Otomotiv Parça & Aksesuar': [
    { max: 1500, percent: 0.22 },
    { max: 5000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  'Motosiklet': [
    { max: 1500, percent: 0.20 },
    { max: 5000, percent: 0.16 },
    { max: null, percent: 0.12 },
  ],
  'Bisiklet & Scooter': [
    { max: 1500, percent: 0.22 },
    { max: 5000, percent: 0.18 },
    { max: null, percent: 0.14 },
  ],
  // Genel oran verilen kategoriler (sabit alt sınır)
  'Emlak': 0.15,
  'İş & Sanayi': 0.18,
  'Ofis & Kırtasiye': 0.20,
  'Evcil Hayvan': 0.20,
  'Koleksiyon & Antika': 0.18,
  'Sağlık & Medikal': 0.22,
  'Yiyecek & İçecek': 0.20,
  'Eğitim & Kurs': 0.15,
  'Seyahat & Bilet': 0.12,
  // Üst kategoriler için temkinli alt sınır
  'Elektronik': 0.08,
  'Ev & Yaşam': 0.12,
  'Kitap & Müzik': 0.08,
  'Otomobil': 0.10,
  'Diğer': 0.15,
};

function getMarginPercentFor(category: string, basePrice: number): number {
  const rule = CATEGORY_MARGIN_RULES[category];
  if (!rule) return CATEGORY_MARGIN_RULES['Diğer'] as number;
  if (typeof rule === 'number') return rule;
  for (const r of rule) {
    if (r.max === null || basePrice <= r.max) return r.percent;
  }
  return (CATEGORY_MARGIN_RULES['Diğer'] as number) || 0.15;
}

// Desi bazlı kargo ücret aralıkları
export type DesiBracket =
  | '0-1'
  | '2-3'
  | '4-5'
  | '6-10'
  | '11-15'
  | '16-20'
  | '21-30'
  | '31-40'
  | '41-50'
  | '51-70'
  | '71-100'
  | '100+';

const DESI_RULES: Record<DesiBracket, { min: number; max?: number; label: string; group: string }> = {
  '0-1':   { min: 40,  max: 55,  label: '0–1 desi',   group: 'Küçük Paketler (0–5 desi)' },
  '2-3':   { min: 55,  max: 70,  label: '2–3 desi',   group: 'Küçük Paketler (0–5 desi)' },
  '4-5':   { min: 65,  max: 80,  label: '4–5 desi',   group: 'Küçük Paketler (0–5 desi)' },
  '6-10':  { min: 75,  max: 100, label: '6–10 desi',  group: 'Orta Paketler (6–15 desi)' },
  '11-15': { min: 95,  max: 120, label: '11–15 desi', group: 'Orta Paketler (6–15 desi)' },
  '16-20': { min: 110, max: 140, label: '16–20 desi', group: 'Büyük Paketler (16–30 desi)' },
  '21-30': { min: 125, max: 160, label: '21–30 desi', group: 'Büyük Paketler (16–30 desi)' },
  '31-40': { min: 160, max: 210, label: '31–40 desi', group: 'Çok Büyük Paketler (31–50 desi)' },
  '41-50': { min: 190, max: 250, label: '41–50 desi', group: 'Çok Büyük Paketler (31–50 desi)' },
  '51-70': { min: 250, max: 350, label: '51–70 desi', group: '50+ Desi (Ağır Taşımacılık)' },
  '71-100':{ min: 350, max: 500, label: '71–100 desi',group: '50+ Desi (Ağır Taşımacılık)' },
  '100+':  { min: 500,           label: '100+ desi',  group: '50+ Desi (Ağır Taşımacılık)' },
};

function getDesiRange(bracket: DesiBracket): { min: number; max?: number } {
  return DESI_RULES[bracket] ? { min: DESI_RULES[bracket].min, max: DESI_RULES[bracket].max } : { min: 0 };
}

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
    try {
      window.dispatchEvent(new Event('messages-updated'));
    } catch (e) {
      // ignore in non-browser contexts
    }
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
    FAVORITES: 'favorites',
    SESSIONS: 'sessions', // map: userId -> Session[]
    LOGIN_LOGS: 'loginLogs', // map: userId -> LoginLog[]
    PENDING_LOGIN: 'pendingLogin', // { userId: string, createdAt: string }
    PENDING_AUTH_SETUP: 'pendingAuthSetup', // map: userId -> secret
  };

  // Sessions and login logs
  static getSessions(userId: string): UserSession[] {
    const raw = localStorage.getItem(this.STORAGE_KEYS.SESSIONS);
    const map = raw ? (JSON.parse(raw) as Record<string, UserSession[]>) : {};
    return map[userId] || [];
  }

  static saveSessions(userId: string, sessions: UserSession[]) {
    const raw = localStorage.getItem(this.STORAGE_KEYS.SESSIONS);
    const map = raw ? (JSON.parse(raw) as Record<string, UserSession[]>) : {};
    map[userId] = sessions;
    localStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(map));
  }

  static getLoginLogs(userId: string): LoginLog[] {
    const raw = localStorage.getItem(this.STORAGE_KEYS.LOGIN_LOGS);
    const map = raw ? (JSON.parse(raw) as Record<string, LoginLog[]>) : {};
    return map[userId] || [];
  }

  static saveLoginLogs(userId: string, logs: LoginLog[]) {
    const raw = localStorage.getItem(this.STORAGE_KEYS.LOGIN_LOGS);
    const map = raw ? (JSON.parse(raw) as Record<string, LoginLog[]>) : {};
    map[userId] = logs;
    localStorage.setItem(this.STORAGE_KEYS.LOGIN_LOGS, JSON.stringify(map));
  }

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
    if (!localStorage.getItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP)) {
      localStorage.setItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP, JSON.stringify({}));
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

  // 2FA - Authenticator kurulum ve doğrulama (RFC 6238)
  static beginAuthenticatorSetup(userId: string): { secret: string; otpauthUrl: string } | null {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    // Use browser-friendly generator instead of Node crypto.randomBytes
    const secret = generateBase32Secret(20);
  const account = users[idx].email || users[idx].name || `user-${userId}`;
  const issuer = 'Varmı';
  const otpauthUrl = buildOtpAuthURL(account, issuer, secret);
    const raw = localStorage.getItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[userId] = secret;
    localStorage.setItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP, JSON.stringify(map));
    return { secret, otpauthUrl };
  }

  static getPendingAuthenticatorSecret(userId: string): string | null {
    const raw = localStorage.getItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return map[userId] || null;
  }

  static cancelAuthenticatorSetup(userId: string) {
    const raw = localStorage.getItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    if (map[userId]) {
      delete map[userId];
      localStorage.setItem(this.STORAGE_KEYS.PENDING_AUTH_SETUP, JSON.stringify(map));
    }
  }

  static async verifyAndEnableAuthenticator(userId: string, token: string): Promise<boolean> {
    const pendingSecret = this.getPendingAuthenticatorSecret(userId);
    if (!pendingSecret) return false;
    const ok = await verifyTOTP(token, pendingSecret, 1);
    if (!ok) return false;
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    const prev = users[idx].twoFactor || { sms: false, email: true, authenticator: false };
    users[idx] = { ...users[idx], twoFactor: { ...prev, authenticator: true, authenticatorSecret: pendingSecret } };
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[idx]));
    this.cancelAuthenticatorSetup(userId);
    return true;
  }

  static disableAuthenticator(userId: string) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;
    const prev = users[idx].twoFactor || { sms: false, email: true, authenticator: false };
    users[idx] = { ...users[idx], twoFactor: { ...prev, authenticator: false, authenticatorSecret: undefined } } as User;
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(users[idx]));
  }

  private static finalizeLogin(user: User): User {
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    // Log login and create a session (demo values)
    const ip = '127.0.0.1';
    const deviceName = navigator?.userAgent || 'Bilinmeyen Cihaz';
    const logs = this.getLoginLogs(user.id);
    logs.push({ id: `log_${Date.now()}`, timestamp: new Date().toISOString(), ip, location: 'Local' });
    this.saveLoginLogs(user.id, logs);

    const sessions = this.getSessions(user.id);
    const session: UserSession = {
      id: `sess_${Date.now()}`,
      deviceName,
      ip,
      lastActiveAt: new Date().toISOString(),
      current: true,
    };
    sessions.push(session);
    this.saveSessions(user.id, sessions);
    return user;
  }

  static startLogin(identifier: string, password: string): { status: 'ok'; user: User } | { status: '2fa'; userId: string } | null {
    this.initializeData();
    const users = this.getUsers();
    
    // Demo için basit doğrulama - gerçek uygulamada hash kontrolü olacak
    // identifier e-posta veya telefon olabilir
    const normPhone = (() => {
      const digits = (identifier || '').replace(/\D/g, '');
      if (!digits) return '';
      const tail10 = digits.replace(/^90/, '').slice(-10); // son 10 hane
      return tail10.length === 10 ? `+90${tail10}` : '';
    })();
    const user = users.find(u => u.email === identifier || (!!normPhone && u.phone === normPhone));
    if (user && (password === '123456' || password === '')) {
      if (user.twoFactor?.authenticator) {
        // mark pending login
        const pending = { userId: user.id, createdAt: new Date().toISOString() };
        localStorage.setItem(this.STORAGE_KEYS.PENDING_LOGIN, JSON.stringify(pending));
        return { status: '2fa', userId: user.id };
      }
      return { status: 'ok', user: this.finalizeLogin(user) };
    }
    return null;
  }

  static loginUser(identifier: string, password: string): User | null {
    const res = this.startLogin(identifier, password);
    if (!res) return null;
    if (res.status === 'ok') return res.user;
    return null; // 2FA bekleniyor
  }

  static login(identifier: string, password: string): User | null {
    // Backward compatibility: behaves like loginUser
    return this.loginUser(identifier, password);
  }

  static async verifyAuthenticatorCode(userId: string, code: string): Promise<User | null> {
    const user = this.getUser(userId);
    if (!user) return null;
    const secret = user.twoFactor?.authenticatorSecret;
    if (!secret) return null;
    const ok = await verifyTOTP(code, secret, 1);
    if (!ok) return null;
    localStorage.removeItem(this.STORAGE_KEYS.PENDING_LOGIN);
    return this.finalizeLogin(user);
  }

  static registerUser(userData: {
    name: string;
    email: string;
    password: string;
    city: string;
    phone?: string;
  }): User | null {
    this.initializeData();
    const users = this.getUsers();
    
    // Check if email or phone already exists
    if (users.find(u => u.email === userData.email)) {
      return null;
    }
    if (userData.phone) {
      const existsPhone = users.find(u => u.phone && u.phone === userData.phone);
      if (existsPhone) return null;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      city: userData.city,
      phone: userData.phone,
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

  static updateCurrentUser(updates: Partial<User>): User | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx === -1) return null;
    const updated: User = { ...users[idx], ...updates };
    users[idx] = updated;
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(this.STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
    return updated;
  }

  static deleteCurrentUser(): boolean {
    const current = this.getCurrentUser();
    if (!current) return false;
    const users = this.getUsers().filter(u => u.id !== current.id);
    localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_USER);
    // Clear related simple maps
    const sessionsRaw = localStorage.getItem(this.STORAGE_KEYS.SESSIONS);
    if (sessionsRaw) {
      const map = JSON.parse(sessionsRaw);
      delete map[current.id];
      localStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(map));
    }
    const logsRaw = localStorage.getItem(this.STORAGE_KEYS.LOGIN_LOGS);
    if (logsRaw) {
      const map = JSON.parse(logsRaw);
      delete map[current.id];
      localStorage.setItem(this.STORAGE_KEYS.LOGIN_LOGS, JSON.stringify(map));
    }
    return true;
  }

  static revokeSession(userId: string, sessionId: string) {
    const sessions = this.getSessions(userId).filter(s => s.id !== sessionId);
    this.saveSessions(userId, sessions);
  }

  static getUserDataBundle(userId: string) {
    const user = this.getUser(userId);
    const listings = this.getListings().filter(l => l.buyerId === userId);
    const offers = this.getAllOffers().filter(o => o.sellerId === userId);
    const messages = this.getAllMessages().filter(m => m.fromUserId === userId || m.toUserId === userId);
    const favorites = this.getFavorites(userId);
    const sessions = this.getSessions(userId);
    const loginLogs = this.getLoginLogs(userId);
    return { user, listings, offers, messages, favorites, sessions, loginLogs };
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

  // Listing delete (only owner can delete). Also purge related offers, messages, and favorites references
  static deleteListing(listingId: string, requesterId: string): boolean {
    this.initializeData();
    const listings = this.getListings();
    const idx = listings.findIndex((l) => l.id === listingId);
    if (idx === -1) return false;
    const listing = listings[idx];
    if (listing.buyerId !== requesterId) {
      throw new Error('Bu ilanı silme yetkiniz yok');
    }

    // Remove listing
    listings.splice(idx, 1);
    localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(listings));

    // Remove related offers
    const offers = this.getOffers().filter((o) => o.listingId !== listingId);
    localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));

    // Remove related messages
    const messages = this.getAllMessages().filter((m) => m.listingId !== listingId);
    localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));

    // Remove from all favorites
    const favoritesStr = localStorage.getItem(this.STORAGE_KEYS.FAVORITES);
    const favMap: Record<string, string[]> = favoritesStr ? JSON.parse(favoritesStr) : {};
    let changed = false;
    Object.keys(favMap).forEach((userId) => {
      const before = favMap[userId] || [];
      const after = before.filter((lid) => lid !== listingId);
      if (after.length !== before.length) {
        favMap[userId] = after;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(this.STORAGE_KEYS.FAVORITES, JSON.stringify(favMap));
    }

    return true;
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
    // Görsel zorunluluğu
    const imgs = (listing as Listing).images || [];
    if (!imgs || imgs.length === 0) {
      throw new Error('İlan için en az 1 görsel yüklemelisiniz');
    }
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
    // Kurallar:
    // - Aynı kullanıcı aynı ilana en fazla 1 teklif verebilir
    // - Teklif geçerlilik süresi (validUntil) en az 1 gün sonrası ve ilanın bitiş tarihini aşmamalı
    const listing = this.getListing(offer.listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const offers = this.getOffers();
    // Görsel adet sınırı: max 5
    const imgs = (offer as Offer).images || [];
    if (imgs.length > 5) {
      throw new Error('Teklife en fazla 5 görsel yükleyebilirsiniz');
    }
    const alreadyOffered = offers.some(
      (o) => o.listingId === offer.listingId && o.sellerId === offer.sellerId
    );
    if (alreadyOffered) {
      throw new Error('Aynı ilana birden fazla teklif verilemez');
    }

    // validUntil doğrulaması (varsa)
    if (offer.validUntil) {
      const now = new Date();
      const minValid = new Date(now);
      minValid.setDate(minValid.getDate() + 1); // min 1 gün
      const valid = new Date(offer.validUntil);
      if (valid.getTime() < minValid.getTime()) {
        throw new Error('Teklif en az 1 gün geçerli olmalıdır');
      }
      if (listing.expiresAt) {
        const listingExpiry = new Date(listing.expiresAt);
        if (valid.getTime() > listingExpiry.getTime()) {
          throw new Error('Teklif süresi ilanın bitiş tarihini aşamaz');
        }
      }
    }

    // İlanın ürün durumu kısıtı: 'any' değilse teklif condition aynı olmalı
    if (listing.condition !== 'any') {
      if (!offer.condition || offer.condition !== listing.condition) {
        throw new Error('Bu ilan için yalnızca ilanla aynı ürün durumu ile teklif verebilirsiniz');
      }
    } else {
      // any ise condition belirtilmeli ve 'new' | 'used' olmalı
      if (!offer.condition || (offer.condition !== 'new' && offer.condition !== 'used')) {
        throw new Error('Ürün durumu geçersiz');
      }
    }

    // Teslim şekli kısıtı: ilan 'both' değilse teklif deliveryType aynı olmalı
    if (listing.deliveryType !== 'both') {
      if (!offer.deliveryType || offer.deliveryType !== listing.deliveryType) {
        throw new Error('Bu ilan için yalnızca belirtilen teslimat şekliyle teklif verebilirsiniz');
      }
    } else {
      // both ise sadece 'shipping' | 'pickup' olmalı
      if (!offer.deliveryType || (offer.deliveryType !== 'shipping' && offer.deliveryType !== 'pickup')) {
        throw new Error('Teslimat şekli geçersiz');
      }
    }

    // Kargo/desi kuralları
    if (offer.deliveryType === 'shipping') {
      // Desi seçimi zorunlu
      if (!offer.shippingDesi) {
        throw new Error('Kargo gönderiminde desi aralığı seçilmelidir');
      }
      const range = getDesiRange(offer.shippingDesi);
      const cost = offer.shippingCost ?? 0;
      if (!Number.isFinite(cost) || cost <= 0) {
        throw new Error('Geçerli bir kargo ücreti giriniz');
      }
      if (typeof range.max === 'number') {
        if (cost < range.min || cost > range.max) {
          throw new Error(`Seçilen desi için kargo ücreti ${this.formatPrice(range.min)} - ${this.formatPrice(range.max)} aralığında olmalıdır`);
        }
      } else {
        // 100+ desi: alt sınır 500 TL
        if (cost < range.min) {
          throw new Error(`100+ desi için kargo ücreti en az ${this.formatPrice(range.min)} olmalıdır`);
        }
      }
    } else if (offer.deliveryType === 'pickup') {
      // Elden teslim: desi ve kargo ücreti olmamalı / 0 olmalı
      if (offer.shippingDesi) {
        throw new Error('Elden teslimde desi seçilemez');
      }
      if ((offer.shippingCost ?? 0) !== 0) {
        throw new Error('Elden teslimde kargo ücreti 0 olmalıdır');
      }
    }

    // Minimum teklif tutarı: ilan bütçe min + kategori bazlı alt kar
    const marginPercent = getMarginPercentFor(listing.category, listing.budgetMin);
    const minAllowed = Math.ceil(listing.budgetMin * (1 + marginPercent));
    if (offer.price < minAllowed) {
      throw new Error(`Teklif en az ${this.formatPrice(minAllowed)} olmalı (kategori alt kar oranı dahil)`);
    }

    const newOffer: Offer = {
      ...offer,
      id: `offer_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    offers.push(newOffer);
    localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));

    // İlan teklif sayısı
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

  // Offer delete (only seller can delete own offer)
  static deleteOffer(offerId: string, requesterId: string): boolean {
    const offers = this.getOffers();
    const idx = offers.findIndex(o => o.id === offerId);
    if (idx === -1) return false;
    const offer = offers[idx];
    if (offer.sellerId !== requesterId) {
      throw new Error('Bu teklifi silme yetkiniz yok');
    }
    // Remove offer
    offers.splice(idx, 1);
    localStorage.setItem(this.STORAGE_KEYS.OFFERS, JSON.stringify(offers));

    // Decrement listing offerCount
    const listings = this.getListings();
    const lidx = listings.findIndex(l => l.id === offer.listingId);
    if (lidx !== -1) {
      const current = listings[lidx].offerCount || 0;
      listings[lidx].offerCount = Math.max(0, current - 1);
      localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    }
    return true;
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
      try {
        window.dispatchEvent(new Event('messages-updated'));
      } catch (e) {
        // ignore in non-browser contexts
      }
    }
  }

  // Kişi bazlı okundu işaretleme: tüm ilanlardan bağımsız olarak otherUserId'den currentUserId'ye gelen okunmamışları okundu yapar
  static markMessagesAsReadWithUser(currentUserId: string, otherUserId: string) {
    const messages = this.getAllMessages();
    let updated = false;

    messages.forEach((msg) => {
      if (msg.fromUserId === otherUserId && msg.toUserId === currentUserId && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(this.STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      try {
        window.dispatchEvent(new Event('messages-updated'));
      } catch (e) {
        // ignore in non-browser contexts
      }
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

  // Teklif alt sınırı (kategori kar oranlarıyla): ilan bütçe min x (1 + oran)
  static getMinAllowedOfferPriceForListing(listing: Listing): number {
    const marginPercent = getMarginPercentFor(listing.category, listing.budgetMin);
    return Math.ceil(listing.budgetMin * (1 + marginPercent));
  }

  // UI yardımcıları: desi seçenekleri ve aralıkları
  static getAllDesiOptions(): Array<{ value: DesiBracket; label: string; group: string; min: number; max?: number }> {
    return (Object.keys(DESI_RULES) as DesiBracket[]).map((key) => ({
      value: key,
      label: DESI_RULES[key].label,
      group: DESI_RULES[key].group,
      min: DESI_RULES[key].min,
      max: DESI_RULES[key].max,
    }));
  }

  static getShippingCostRangeForDesi(bracket: DesiBracket): { min: number; max?: number } {
    return getDesiRange(bracket);
  }
}

// Initialize data on import
DataManager.initializeData();

// Extra interfaces
export interface UserSession {
  id: string;
  deviceName: string;
  ip: string;
  lastActiveAt: string;
  current?: boolean;
}

export interface LoginLog {
  id: string;
  timestamp: string;
  ip: string;
  location?: string;
}