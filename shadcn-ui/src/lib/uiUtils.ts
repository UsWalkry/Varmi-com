// Utility functions extracted from mockData.ts for UI formatting
// These don't depend on localStorage and can be used safely

export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0 ₺';
  }
  return Number(price).toLocaleString('tr-TR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }) + ' ₺';
}

export function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) return `${diffDay} gün önce`;
  if (diffHour > 0) return `${diffHour} saat önce`;
  if (diffMin > 0) return `${diffMin} dakika önce`;
  return 'Az önce';
}

export function maskDisplayName(name: string): string {
  if (!name || name.trim().length === 0) return 'Anonim';
  
  const trimmed = name.trim();
  if (trimmed.length <= 3) return trimmed;
  
  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  const middle = '*'.repeat(Math.max(1, trimmed.length - 2));
  
  return `${firstChar}${middle}${lastChar}`;
}

export interface CategoryGroup {
  group: string;
  subcategories: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: 'Elektronik',
    subcategories: [
      'Bilgisayar / Tablet',
      'Bilgisayar Parçaları',
      'Ağ - Modem - Akıllı Ev',
      'Çevre Birimleri',
      'Yazılım Ürünleri',
      'Bilgisayar Aksesuarları',
      'Kulaklık',
      'Monitör',
      'Yazıcılar & Projeksiyon',
      'Telefon & Aksesuar',
      'TV & Ses Sistemleri',
      'Beyaz Eşya',
      'Klima & Isıtıcı',
      'Elektrikli Ev Aletleri',
      'Foto & Kamera',
      'Oyun & Konsol',
    ],
  },
  {
    group: 'Moda',
    subcategories: [
      'Kadın Giyim',
      'Erkek Giyim',
      'Ayakkabı & Çanta',
      'Çocuk Giyim',
    ],
  },
  {
    group: 'Ev, Yaşam, Kırtasiye',
    subcategories: [
      'Mutfak & Sofra',
      'Mobilya',
      'Ev Tekstil',
      'Ofis & Kırtasiye',
    ],
  },
  {
    group: 'Oto, Bahçe, Yapı',
    subcategories: [
      'Yapı Market',
      'El Aletleri',
      'Güvenlik',
      'Bahçe',
      'Elektrik & Tesisat',
      'Oto Aksesuar',
      'Motor Ürünleri',
      'Yedek Parça',
    ],
  },
  {
    group: 'Anne, Bebek, Oyuncak',
    subcategories: [
      'Oyuncak',
      'Bebek Arabası',
      'Mama',
      'Bebek Odası',
      'Bez & Islak Mendil',
      'Bebek Giyim',
    ],
  },
  {
    group: 'Spor & Outdoor',
    subcategories: [
      'Spor Giyim',
      'Fitness',
      'Kamp',
      'Scooter / Paten',
      'Bisiklet',
      'Su Sporları',
      'Avcılık',
    ],
  },
  {
    group: 'Kozmetik',
    subcategories: [
      'Parfüm',
      'Makyaj',
      'Cilt Bakım',
      'Saç Bakım',
      'Ağız Bakım',
      'Epilasyon',
      'Deodorant',
    ],
  },
  {
    group: 'Süpermarket & Petshop',
    subcategories: [
      'Temizlik Ürünleri',
      'Gıda',
      'İçecek',
      'Petshop',
      'Ev Tüketim',
    ],
  },
  {
    group: 'Kitap, Müzik, Hobi',
    subcategories: [
      'Kitap',
      'Müzik Enstrümanları',
      'Film',
      'Hobi',
      'Dijital Ürünler',
    ],
  },
];

export const categories = CATEGORY_GROUPS.flatMap(g => g.subcategories);

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
  'Kayseri'
];

// Condition translation (English -> Turkish)
export function translateCondition(condition: string | null | undefined): string {
  if (!condition) return '';
  
  const conditionMap: Record<string, string> = {
    'new': 'Sıfır',
    'like_new': 'Sıfır Gibi',
    'good': 'İyi',
    'fair': 'Orta',
    'poor': 'Kötü',
    'any': 'Farketmez'
  };
  
  return conditionMap[condition.toLowerCase()] || condition;
}