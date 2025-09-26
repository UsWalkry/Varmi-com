## AI Kod Ajanları İçin Odaklı Talimatlar

Bu belge yalnızca bu depo için gerekli, uygulamaya hızlı adapte olmanız amaçlanmıştır. Gereksiz genel tavsiyelerden kaçının.

### 1. Teknoloji ve Giriş Noktaları

- Stack: Vite + React 19 + TypeScript + Tailwind + shadcn-ui (Radix tabanlı) + Zustand yok (ancak depend olarak var), veri remote değil.
- Alias: `@` → `src`. UI bileşenleri: `@/components/ui/*` (kopyalanmış shadcn seti).
- Mount zinciri: `src/main.tsx` → `<App />` (router + provider sarmalayıcıları). Global stiller: `src/index.css`.

### 2. Yönlendirme ve Provider Katmanı

- Router seçimi dinamik: Codespaces domaini veya `VITE_ROUTER_MODE=hash` ise `HashRouter`, aksi halde `BrowserRouter` (`src/App.tsx`).
- Ortak providerlar: `QueryClientProvider`, `TooltipProvider`, `Toaster`. React Query şu an gerçek fetch kullanmıyor; gelecek entegrasyonlara hazır.
- Hata yönetimi: Üst seviye `LocalErrorBoundary` (iki konum: `components/ui` ve `components/`). Yeni kritik UI bileşenleri eklerken lokal boundary kullanın.

### 3. Veri Katmanı - `src/lib/mockData.ts`

- Tüm kalıcı durum localStorage; model objeleri: User, Listing, Offer, Message, Review, Session, LoginLog.
- Merkezi API: `DataManager` (yalın statik metotlar). Okumalar senkron; TOTP / 2FA doğrulama metotları async.
- Önemli kurallar (mutasyon eklerken koru):
  1. Listing eklerken en az 1 görsel zorunlu (`addListing`).
  2. Aynı seller aynı listing'e ikinci teklif veremez (`addOffer`).
  3. Teklif `validUntil` >= (şu an +1 gün) ve `listing.expiresAt`'ı aşamaz.
  4. Listing `condition != 'any'` ise teklif condition aynı olmalı; deliveryType için benzer kural (`both` dışında tam eşleşme).
  5. Shipping tekliflerinde: `shippingDesi` zorunlu, ücret ilgili desi min–max aralığında; pickup'ta desi/ücret girilmez (0 olmalı).
  6. Minimum teklif: `budgetMin * (1 + kategori kar oranı)`; oran `getMinAllowedOfferPriceForListing` üzerinden hesaplanmalı.
  7. Offer kabulünde: diğer aktif teklifler otomatik `rejected`, listing `closed`.
  8. Silme işlemleri (listing/offer) ilişkili sayaç ve ilişkili kayıtları (messages/favorites/offers) temizler.
- 2FA Akışı: `startLogin` → (gerekirse) pending login kaydı → `verifyAuthenticatorCode`; kurulum: `beginAuthenticatorSetup` → `verifyAndEnableAuthenticator`.

### 4. UI ve Komponent Desenleri

- Sayfalar: `src/pages/*` (örn. `Index`, `ListingDetail`, `CreateListing`). Router konfigürasyonu yalnızca `App.tsx` içinde tutulur.
- Parçalama: Görsel / interaktif widgetlar `components/` altında; saf stil + form kontrolleri `components/ui/*`.
- Örnek DataManager kullanımı (Listing oluşturma):

```ts
DataManager.addListing({
  title: "Başlık",
  description: "Açıklama",
  images: ["data:"],
  category: "Elektronik",
  budgetMin: 1000,
  budgetMax: 1800,
  condition: "any",
  city: "İstanbul",
  deliveryType: "both",
  buyerId: user.id,
  buyerName: user.name,
  status: "active",
});
```

- Örnek Offer (shipping kısıtları):

```ts
DataManager.addOffer({
  listingId: l.id,
  sellerId: me.id,
  sellerName: me.name,
  sellerRating: 0,
  price: 1250,
  condition: "new",
  deliveryType: "shipping",
  shippingDesi: "2-3",
  shippingCost: 60,
  status: "active",
});
```

### 5. Geliştirme Komutları

- Kurulum: `pnpm i`
- Dev: `pnpm dev` (gerekirse host: `pnpm dev:host`)
- Lint / Tip: `pnpm lint`, `pnpm typecheck` (watch varyantları mevcut)
- Build / Preview: `pnpm build`, `pnpm preview`
- Ortam Değişkenleri: `VITE_PORT`, `VITE_ROUTER_MODE` (`hash` veya boş).

### 6. Konvansiyonlar ve İpuçları

- Her yeni domain kuralı mockData içine tek sorumluluklu statik metot olarak eklenmeli; UI dosyalarında iş kuralı yinelenmez.
- Fiyat & tarih formatı için `DataManager.formatPrice / formatDate / getTimeAgo` kullanın, duplike etmeyin.
- Kullanıcı gizleme: Listing `maskOwnerName` varsa UI `maskDisplayName` (`lib/utils.ts`) ile render eder.
- Toast: ya `import { toast } from 'sonner'` ya da `@/components/ui/sonner`/`@/lib/sonner` üzerinden.
- Performans: localStorage çağrıları basit; ağır liste işlemlerinde önce filtre sonra map/sort sırası korunmalı (bkz. `searchListings`).

### 7. Ne Yapmamalısınız

- Teklif validasyonunu UI'da yeniden yazmayın; DataManager hatasını yüzeye taşıyın.
- LocalStorage anahtarlarını dışarıdan manipüle etmeyin (merkezi metotları çağırın).
- Router konfigünü birden fazla yerde çoğaltmayın; yeni route yalnız `App.tsx`.

### 8. Genişletme Önerileri (Belgeyi güncellerken kaldırılabilir)

- Kalıcı backend eklenecekse DataManager metodları adaptör katmanına taşınabilir; imzaları koruyun ve UI değişikliğini minimize edin.
- React Query entegrasyonu için her DataManager okuması bir queryFn içine sarılabilir (örn. `['listings'] → DataManager.getListings()`).

Belirsiz bir kural tespit ederseniz kod referansı ekleyerek bu belgeyi güncelleyin. Önce mevcut desenleri (tekil statik servis, şeffaf localStorage) bozmayın.
