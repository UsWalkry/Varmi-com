# Copilot Instructions for AI Coding Agents

## Proje Özeti ve Yığın

- Stack: Vite + React + TypeScript + Tailwind CSS + shadcn-ui
- UI bileşenleri: `src/components/ui/**` altında hazır. Alias: `@` → `src` (örn. `@/components/ui/button`).
- Giriş: `src/main.tsx` `App.tsx`'i mount eder; global stiller `src/index.css`.

## Mimari ve Yönlendirme

- Sayfalar: `src/pages/**` (örn. `Index.tsx`, `Dashboard.tsx`, `Profile.tsx`). Router tanımı `src/App.tsx` içinde.
- Router modu: `BrowserRouter` varsayılan; Codespaces (`*.app.github.dev`) veya `VITE_ROUTER_MODE=hash` olduğunda otomatik `HashRouter` kullanılır.
- Sağlayıcılar: `QueryClientProvider` (react-query), `TooltipProvider`, `Toaster` (`src/components/ui/sonner.tsx`). Veri uzaktan değil; sağlayıcılar UI için hazır.

## Veri Katmanı ve Kurallar (src/lib/mockData.ts)

- Tüm veri localStorage ile yönetilir; merkezi servis: `DataManager` (senkron ağırlıklı; 2FA doğrulama gibi bazı metodlar async).
- Kullanıcı: basit kayıt/giriş, oturum ve login logları tutulur. 2FA (TOTP) destekli akış: `startLogin` → (gerekirse) `verifyAuthenticatorCode`. Kurulum: `beginAuthenticatorSetup` → `verifyAndEnableAuthenticator`.
- İlan: `addListing` en az 1 görsel zorunlu, `updateListing`, `deleteListing` (sahibi olmayan silemez; ilişkili teklif/mesaj/favoriler de temizlenir).
- Teklif: her satıcı bir ilana en fazla 1 teklif; `validUntil` en az +1 gün ve varsa ilan bitişini aşamaz; ilan `condition` ve `deliveryType` ile uyum şart; kargo için desi ve ücret aralık kontrolleri; kategoriye göre minimum kar marjı uygulanır.
- Mesaj/Favoriler: konuşma, okunma, favori listeleme ekleme/çıkarma yardımcıları mevcuttur.

Örnek – UI bileşeni ve veri kullanımı:

```tsx
import { Button } from "@/components/ui/button";
import { DataManager } from "@/lib/mockData";
// En az 1 görsel ile ilan oluşturun
const listing = DataManager.addListing({
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

Örnek – Teklif kısıtları:

```ts
DataManager.addOffer({
  listingId: listing.id,
  sellerId: me.id,
  sellerName: me.name,
  sellerRating: 0,
  price: 1200,
  condition: "new",
  deliveryType: "shipping",
  shippingDesi: "2-3",
  shippingCost: 60,
  status: "active",
});
// Not: kargo ücreti desi aralığına uymalı; aynı satıcı aynı ilana ikinci kez teklif veremez.
```

## Geliştirme Akışı ve Komutlar (package.json)

- Kurulum: `pnpm i` | Geliştirme: `pnpm dev` (veya `pnpm dev:host`) | Build: `pnpm build` | Öni̇zleme: `pnpm preview`
- Kalite: `pnpm lint` (ESLint), `pnpm typecheck` (tsc). İzleme varyantları: `lint:watch`, `typecheck:watch`.
- Ortam: `VITE_PORT` ile port; `VITE_ROUTER_MODE=hash` ile hash router zorlanabilir.

## Desenler ve Konvansiyonlar

- İçe aktarımlar: `@/…` alias'ını kullanın; UI bileşenleri `@/components/ui/**` altından gelir.
- Bildirim/toast: `import { toast } from 'sonner'` veya `@/lib/sonner` kısa yolu.
- Hata yakalama: `src/components/ui/LocalErrorBoundary.tsx` ve `src/components/LocalErrorBoundary.tsx` mevcut.
- Tailwind: `tailwind.config.ts` altında özelleştirmeler (renkler, radius, animasyonlar). İçerik globları `./src/**/*.{ts,tsx}` dahil.

## Entegrasyonlar ve Notlar

- Gerçek backend bağlantısı yok; tüm veri localStorage'da. `@supabase/supabase-js` bağımlılığı ekli ama kullanılmıyor.
- Vite eklentisi: `@metagptx/vite-plugin-source-locator` (prefix: `mgx`) kaynak eşlemeyi zenginleştirir.

Ana dosyalar: `src/App.tsx`, `src/pages/**`, `src/lib/mockData.ts`, `src/components/ui/**`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig*.json`.

Belirsiz kalan bir akış veya kural görürseniz bu dosyayı güncelleyin; proje kodundaki kalıpları (özellikle `DataManager`) temel alın.
