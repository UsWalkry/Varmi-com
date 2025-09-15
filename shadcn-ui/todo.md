# Ters İlan Pazaryeri - MVP Todo List

## Proje Özeti
"Var mı?" - Alıcıların ihtiyaç ilanı açtığı, satıcıların teklif verdiği ters pazaryeri platformu

## MVP Kapsamı (8 dosya limiti)
Temel işlevselliği sağlayacak en kritik özellikler:

### 1. Temel Sayfalar ve Routing
- **src/pages/Index.tsx** - Ana sayfa (ilan listesi, arama)
- **src/pages/ListingDetail.tsx** - İlan detay sayfası (tekliflerle)
- **src/pages/CreateListing.tsx** - İlan oluşturma formu
- **src/pages/Dashboard.tsx** - Kullanıcı paneli (ilanlar, teklifler)

### 2. Temel Bileşenler
- **src/components/ListingCard.tsx** - İlan kartı bileşeni
- **src/components/OfferCard.tsx** - Teklif kartı bileşeni
- **src/components/CreateOfferModal.tsx** - Teklif verme modalı
- **src/lib/mockData.ts** - Mock veri ve localStorage yönetimi

## Temel Kullanıcı Akışları (MVP)
1. **Ana sayfa** - İlanları görüntüleme, arama/filtreleme
2. **İlan oluşturma** - Basit form ile ihtiyaç ilanı açma
3. **İlan detayı** - Teklifleri görme, yeni teklif verme
4. **Dashboard** - Kendi ilanları ve teklifleri yönetme

## Teknik Özellikler
- localStorage ile veri saklama (backend simülasyonu)
- Responsive tasarım (mobil öncelikli)
- Türkçe arayüz
- Shadcn-ui bileşenleri
- TypeScript tip güvenliği

## Veri Modeli (localStorage)
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'both';
}

interface Listing {
  id: string;
  buyerId: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  condition: 'new' | 'used' | 'any';
  city: string;
  deliveryType: 'shipping' | 'pickup' | 'both';
  status: 'active' | 'closed';
  createdAt: string;
  expiresAt: string;
}

interface Offer {
  id: string;
  listingId: string;
  sellerId: string;
  price: number;
  condition: 'new' | 'used';
  brand?: string;
  model?: string;
  description: string;
  deliveryType: 'shipping' | 'pickup';
  shippingCost: number;
  etaDays: number;
  status: 'active' | 'accepted' | 'rejected';
  createdAt: string;
}
```

## Özellik Öncelikleri
✅ P0 (Kritik): İlan listeleme, oluşturma, teklif verme
⚠️ P1 (Önemli): Arama/filtreleme, kullanıcı paneli
🔄 P2 (Gelecek): Mesajlaşma, ödeme, değerlendirme sistemi

Bu MVP ile temel pazaryeri işlevselliği çalışacak ve genişletilebilir altyapı hazır olacak.