## Copilot için Hızlı Kılavuz (shadcn-ui)

- Yığın: Vite + React 19 + TypeScript + Tailwind + shadcn-ui (Radix). Alias `@` → `src`.
- Giriş akışı: `src/main.tsx` → `App.tsx` (sarılı: `LocalErrorBoundary` + `QueryClientProvider` + `TooltipProvider` + `Toaster`).
- Yönlendirme: Varsayılan `BrowserRouter`. Codespaces (`*.app.github.dev`) veya `VITE_ROUTER_MODE=hash` → `HashRouter` (bkz. `src/App.tsx`, v7 future bayrakları açık).

### Veri Katmanı — DataManager (`src/lib/mockData.ts`)

- Tüm veri localStorage’da; gerçek backend yok (Supabase bağımlılığı kullanılmıyor).
- Kapsam: Users, Listings, Offers, Messages, Favorites, Reviews, Sessions/Login Logs, 2FA (TOTP), ThirdPartyOrder.
- Mesaj olayı: `addMessage` sonunda `window.dispatchEvent(new Event('messages-updated'))` yayınlanır.
- Listing kuralları: `addListing` en az 1 görsel ister; `deleteListing` sadece sahibi ve offer/message/favorite referanslarını da temizler; `updateListing` mevcut.
- Offer kuralları: Bir satıcı → bir ilana 1 teklif; `images` ≤ 5; `quantity` ≥ 1; `validUntil` ≥ +1 gün ve (varsa) `listing.expiresAt`’ı aşamaz; `condition`/`deliveryType` ilanınkine uyar. Kargo: `shippingDesi` zorunlu, ücret desi min–max içinde; pickup: desi olamaz, ücret 0. Min fiyat = `budgetMin × (1 + kategori alt karı)`.
- Sipariş akışı: `acceptOffer` → `status='accepted'`, `orderStage='received'`, ilan `closed`, alıcıya otomatik mesaj. Devamı: `setOfferCarrier` → `setOfferShipped` → `setOfferDelivered` → `completeOffer`.
- Favoriler: localStorage `favorites` (map: userId → string[]). API: `getFavorites`/`addToFavorites`/`removeFromFavorites`/`isFavorite`/`getUserFavoriteListings`.
- Auth/2FA: `startLogin` → (gerekirse) `verifyAuthenticatorCode`. Kurulum: `beginAuthenticatorSetup` → `verifyAndEnableAuthenticator` (TOTP, WebCrypto HMAC-SHA1).

### UI ve Dosya Düzeni

- Sayfalar: `src/pages/**` (Index, ListingDetail, CreateListing, Dashboard, Profile, Inbox…). Router `src/App.tsx` içinde.
- UI: shadcn bileşenleri `@/components/ui/**`. Toast: `@/components/ui/sonner` (Toaster) ve `import { toast } from 'sonner'`.
- Hata yakalama: `@/components/ui/LocalErrorBoundary` (App’te kullanılır) ve `src/components/LocalErrorBoundary.tsx` varyantı.
- Not: `pages/ProductDetail.tsx` DataManager’da olmayan `addProductToFavorites`/`removeProductFromFavorites`/`isProductFavorite` referanslarını içerir; geçerli favori API’si listelemeler içindir (bkz. “Favoriler” yukarıda).

### Geliştirme Komutları (`package.json`)

- Kurulum: pnpm i
- Geliştirme: pnpm dev | pnpm dev:open | pnpm dev:host
- Build/Preview: pnpm build | pnpm preview
- Kalite: pnpm lint (ESLint) | pnpm typecheck (tsc); izleme: pnpm lint:watch | pnpm typecheck:watch
- Ortam: `VITE_PORT`, `VITE_ROUTER_MODE=hash`

### Vite/Tailwind

- Alias: `@` → `./src` (`vite.config.ts`), eklenti: `@metagptx/vite-plugin-source-locator` (prefix `mgx`).
- Tailwind: `tailwind.config.ts`, içerik globu `./src/**/*.{ts,tsx}`.

### Kısa Örnekler

```tsx
import { DataManager } from "@/lib/mockData";
DataManager.addListing({
  title: "…",
  description: "…",
  images: ["data:"],
  category: "Elektronik",
  budgetMin: 1000,
  budgetMax: 2000,
  condition: "any",
  city: "İstanbul",
  deliveryType: "both",
  buyerId: user.id,
  buyerName: user.name,
  status: "active",
});
```

```ts
// Favori aç/kapat (iyimser güncelleme için bkz. components/FavoriteButton.tsx)
DataManager.addToFavorites(userId, listingId);
DataManager.removeFromFavorites(userId, listingId);
```

Bu dosya, kodda keşfettiğiniz yeni kurallar/akışlarla (özellikle DataManager kısıtları, mesaj olayı, 2FA) birlikte kısa ve öz biçimde güncellenmelidir.
