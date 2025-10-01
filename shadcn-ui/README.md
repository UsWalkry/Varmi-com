# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

## Supabase bağlantısı

**Not:** Supabase varsayılan olarak dev'de kapalıdır. Etkinleştirmek için aşağıdaki adımları izleyin.

1. `shadcn-ui/.env.local` dosyası oluşturun (`.env.example`'dan kopyalayabilirsiniz):

```bash
cp .env.example .env.local
```

2. `.env.local` içinde Supabase bilgilerini ekleyin:

```
VITE_SUPABASE_ENABLED=true
VITE_SUPABASE_URL=YOUR_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

- `VITE_SUPABASE_ENABLED`: `true` yapın (varsayılan `false`)
- `VITE_SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API → Project API keys → anon public

3. Migration ve seed:

- `supabase/migrations/20250930_init.sql` ve `supabase/seed/20250930_seed.sql` dosyalarını Supabase SQL Editor ile çalıştırın.

4. İstemci tarafı kullanım:

- Supabase client: `src/lib/supabase.ts`
- API helpers: `src/lib/sbApi.ts` (ör. `fetchListings()`, `createListing()`)

**Supabase kapalıyken:** Uygulama localStorage (DataManager) ile çalışır. Konsol uyarısı görürsünüz: `[supabase] Disabled by VITE_SUPABASE_ENABLED flag`

**Placeholder credentials uyarısı:** `.env.local` içinde placeholder değerler (`your-project-id`, `your-anon-key`) kullanırsanız Supabase istekleri yapılmaz ve konsol uyarısı görürsünüz.

Veritabanı diyagramı (özet):

```
users (id PK, auth_user_id -> auth.users.id)
  └─< listings (buyer_id -> users.id)
	  └─< offers (listing_id -> listings.id, seller_id -> users.id)
		  └─< orders (source_offer_id -> offers.id, buyer_id/seller_id -> users.id)
messages (from_user_id/to_user_id -> users.id)
notifications (user_id -> users.id)
payments (order_id -> orders.id, user_id -> users.id)
```

# Sunucu üzerinden Nodemailer kullanımı

VITE_MAIL_API_BASE=http://localhost:8787
VITE_MAIL_API_KEY=change-this-key

Server klasöründe `.env` oluşturup SMTP bilgilerinizi girin ve sunucuyu başlatın:

```
cd ../server
cp .env.example .env
# .env içinde SMTP_HOST, SMTP_PORT=465, SMTP_USER=noreply@varmi.com, SMTP_PASS=*** ayarlayın
pnpm i
pnpm dev
```

Ardından frontend `.env.local` içinde VITE_MAIL_API_BASE ve VITE_MAIL_API_KEY tanımlıysa e-postalar backend üzerinden gönderilir.

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

````shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
````

**To build**

```shell
pnpm run build
```
