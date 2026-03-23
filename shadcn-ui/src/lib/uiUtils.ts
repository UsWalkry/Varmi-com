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

export const categories = [
  'Teknoloji',
  'Moda & Giyim', 
  'Ev & Yaşam',
  'Spor & Outdoor',
  'Kitap & Müzik',
  'Sağlık & Güzellik',
  'Bebek & Çocuk',
  'Otomotiv',
  'Hobi & Sanat',
  'Elektronik & Bilgisayar',
  'Cep Telefonu & Aksesuar',
  'Beyaz Eşya',
  'Mobilya & Dekorasyon',
  'Bahçe & Yapı Market',
  'Kozmetik & Kişisel Bakım',
  'Süpermarket & Petshop',
  'Anne & Bebek',
  'Oyuncak & Oyun',
  'Kırtasiye & Ofis',
  'Elektrikli Ev Aletleri',
  'Ayakkabı & Çanta',
  'Aksesuar & Takı',
  'Saat & Gözlük',
  'İç Giyim & Pijama',
  'Spor Giyim & Ayakkabı',
  'Outdoor & Kamp Malzemeleri',
  'Bisiklet & Scooter',
  'Müzik Enstrümanları',
  'Film & Dizi',
  'Koleksiyon',
  'El Sanatları & Hobi',
  'Sanat & Antika',
  'Evcil Hayvan Ürünleri',
  'Yiyecek & İçecek',
  'Vitamin & Takviye',
  'Medikal Ürünler',
  'Oto Aksesuar & Yedek Parça',
  'Motor & ATV',
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