# Copilot için proje talimatları (Varmı)

Monorepo: `shadcn-ui/` (Vite + React 19 + TS + Tailwind + shadcn-ui) ve `server/` (Express + Nodemailer). Veri katmanı tamamen tarayıcı localStorage’dadır; backend yalnızca e-posta içindir.

## Mimari ve akış

- Giriş: `shadcn-ui/src/main.tsx` → `src/App.tsx` (sarılır: `LocalErrorBoundary`, `QueryClientProvider`, `TooltipProvider`, `Toaster`).
- Router: `App.tsx` Codespaces’ta veya `VITE_ROUTER_MODE=hash` ise `HashRouter`, aksi halde `BrowserRouter` (React Router v7 future bayrakları açık).
- Veri/iş kuralları: `src/lib/mockData.ts` içindeki `DataManager` tüm CRUD ve kuralların tek kaynağıdır (localStorage). Yeni özellikler eklerken DataManager API’larını kullanın; LS’ye doğrudan yazmayın.

## DataManager — önemli kurallar

- İlan (`addListing`): en az 1 görsel zorunlu; başlık otomatik “Var mıı?” ile biter; `deleteListing` yalnızca sahibi ve bağlı `offers/messages/favorites` temizlenir; `getListings` çağrısında süresi dolanlar purge edilir.
- Teklif (`addOffer`): aynı satıcı bir ilana 1 kez; görseller ≤ 5; `price > 0 && ≤ listing.budgetMax`; `condition` ilanınkine uymalı; `deliveryType` ilanın kısıtına uymalı; kargo için `shippingDesi` zorunlu ve ücret desi min–max içinde; pickup’ta desi olamaz ve kargo ücreti 0.
- Sipariş akışı: `acceptOffer` → `orderStage: 'received'` → `setOfferCarrier` → `setOfferShipped` → `setOfferDelivered` → `setOfferCompleted`.
- 3. taraf satın alma: `purchaseFromOffer` (ilan sahibi ve satıcı hariç kullanıcı); stok kuralı: satın alınabilir adet = `(quantity - 1 - soldToOthers)`.
- Mesajlar: `addMessage` sonrası `window.dispatchEvent('messages-updated')`; okuma için `markMessagesAsRead*` kullanın.
- Favoriler: listing-id bazlı map (userId → string[]); `getUserFavoriteListings`, `isFavorite`. Not: `pages/ProductDetail.tsx` ürün favori API’lerine referans verir ama DataManager’da yalnızca listing favorisi vardır.
- 2FA (TOTP): `beginAuthenticatorSetup` → `verifyAndEnableAuthenticator`; giriş: `startLogin` 2FA bekletebilir, `verifyAuthenticatorCode` tamamlar.

## E-posta entegrasyonu

- Frontend: `src/lib/mail.ts` → `src/lib/serverMail.ts` ile `POST /api/send` çağrısı. ENV: `VITE_MAIL_API_BASE`, `VITE_MAIL_API_KEY`.
- Backend (server): `server/src/index.ts` Express + Nodemailer. ENV: `SMTP_*`/`MAIL_*`, `MAIL_API_KEY` (ops.), `PORT` (8787). Konfig yoksa dev’de `jsonTransport` ile simüle eder; `/health` doğrulama endpoint’i; PM2 için `server/ecosystem.config.js`.

## Geliştirme komutları

- shadcn-ui: `pnpm i` → `pnpm dev` | `pnpm build` | `pnpm preview` | kalite: `pnpm lint`, `pnpm typecheck`. Alias `@` → `src` (bkz. `vite.config.ts`). Tailwind içerik: `./src/**/*.{ts,tsx}`.
- server: `pnpm i` → `pnpm dev` (tsx watch) | `pnpm build` | `pnpm start`.

## Örnekler

- Teklif ekleme (kargo/desi kurallı):
  DataManager.addOffer({ listingId, sellerId, sellerName, sellerRating, price: 900, quantity: 1, condition: 'used', deliveryType: 'shipping', shippingDesi: '6-10', shippingCost: 90 });
- Favori aç/kapat (listing):
  DataManager.addToFavorites(user.id, listing.id); DataManager.removeFromFavorites(user.id, listing.id);

Daha fazla ayrıntı: `DEPLOYMENT.md`, `shadcn-ui/README.md`, `server/README.md`, ayrıca `shadcn-ui/.github/copilot-instructions.md` (frontend’e özgü notlar). Bu belgeyi yeni kurallar/akışlar keşfedildikçe kısa ve somut biçimde güncelleyin.
