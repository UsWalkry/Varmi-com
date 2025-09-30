# Varmı – Supabase Entegrasyonu

## Kurulum

1. Supabase ortam değişkenleri

- `shadcn-ui/.env.local` içine:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

2. Migration ve seed

- Supabase SQL Editor’da şu dosyaları çalıştırın:
  - `supabase/migrations/20250930_init.sql`
  - `supabase/seed/20250930_seed.sql`

3. Çalıştırma

- Frontend:

```
pnpm i
pnpm dev
```

- Opsiyonel mail server için `server/README.md`’ye bakın.

## Tablolar ve ilişkiler (diyagram)

```
users (id PK, auth_user_id -> auth.users.id)
  └─< listings (buyer_id -> users.id)
        └─< offers (listing_id -> listings.id, seller_id -> users.id)
              └─< orders (source_offer_id -> offers.id, buyer_id/seller_id -> users.id)
messages (from_user_id/to_user_id -> users.id)
notifications (user_id -> users.id)
payments (order_id -> orders.id, user_id -> users.id)
```

## Güvenlik

- Tüm tablolarda RLS aktiftir.
- Policy’ler auth.uid() üzerinden:
  - users: sadece kendin (admin hariç)
  - listings: herkes select; sadece sahibi insert/update/delete
  - offers: sadece teklif sahibi ve ilgili ilan sahibi select; satıcı insert/update/delete
  - orders: sadece alıcı ve satıcı select/cud
  - messages: sadece gönderen/alıcı select; gönderen cud
  - notifications: sadece sahibi select/cud
  - payments: sadece sahibi select/cud (admin hariç)

## Bildirim tetikleyicileri

- Teklif eklendiğinde ilan sahibine notification, offer_count artar.
- Mesaj geldiğinde alıcıya notification.
- Sipariş oluşturulduğunda alıcı ve satıcıya notification.

## Notlar

- Frontend’te `src/lib/supabase.ts` client, `src/lib/sbApi.ts` API yardımcılarıdır.
- Supabase env yoksa uygulama DataManager (localStorage) ile çalışmayı sürdürür.
