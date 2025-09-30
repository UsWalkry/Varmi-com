-- Seed data for Varmı
-- Create two auth users via Supabase Dashboard or use SQL to insert into auth schema (usually managed by Supabase)
-- Here we seed our public.users mapped to existing auth.users

-- Assume two auth users exist with ids x_user and y_user; replace with real ids when seeding manually
-- For local testing, you can upsert with auth.uid() impersonation via service role in scripts.

-- Demo UUIDs (replace if needed)
with u as (
  select '11111111-1111-1111-1111-111111111111'::uuid as au1,
         '22222222-2222-2222-2222-222222222222'::uuid as au2
)
insert into public.users (auth_user_id, email, name, city, role)
select u.au1, 'alice@example.com', 'Alice', 'İstanbul', 'admin' from u
on conflict (auth_user_id) do nothing;

with u as (
  select '22222222-2222-2222-2222-222222222222'::uuid as au
)
insert into public.users (auth_user_id, email, name, city)
select u.au, 'bob@example.com', 'Bob', 'Ankara' from u
on conflict (auth_user_id) do nothing;

-- One listing by Alice
insert into public.listings (title, description, images, category, budget_max, condition, city, delivery_type, buyer_id, status)
select 'iPhone 13 Var mıı?', '64GB veya 128GB olabilir', '["https://picsum.photos/seed/iphone/600/400"]'::jsonb,
       'Elektronik', 20000, 'any', 'İstanbul', 'both', u.id, 'active'
from public.users u where u.email = 'alice@example.com'
on conflict do nothing;

-- One offer by Bob to Alice's listing
insert into public.offers (listing_id, seller_id, seller_name, seller_rating, price, quantity, condition, delivery_type, shipping_desi, shipping_cost, status)
select l.id, ub.id, 'Bob', 4.8, 18000, 1, 'used', 'shipping', '6-10', 100, 'active'
from public.listings l cross join public.users ua cross join public.users ub
where ua.email = 'alice@example.com' and ub.email = 'bob@example.com' and l.buyer_id = ua.id
on conflict do nothing;

-- One order (3rd party) where Alice buys Bob's offer
insert into public.orders (source_offer_id, listing_id, seller_id, buyer_id, price, quantity, shipping_cost, delivery_type, shipping_desi)
select o.id, o.listing_id, o.seller_id, ua.id, o.price, 1, coalesce(o.shipping_cost,0), o.delivery_type, o.shipping_desi
from public.offers o join public.users ua on ua.email = 'alice@example.com'
on conflict do nothing;

-- One message between Alice and Bob
insert into public.messages (listing_id, from_user_id, to_user_id, content)
select l.id, ua.id, ub.id, 'Merhaba, teklifinizi gördüm.'
from public.listings l, public.users ua, public.users ub
where ua.email = 'alice@example.com' and ub.email = 'bob@example.com' and l.buyer_id = ua.id
on conflict do nothing;

-- Notifications
insert into public.notifications (user_id, type, payload)
select ua.id, 'offer_received', jsonb_build_object('listing_id', l.id, 'seller_name', 'Bob')
from public.listings l join public.users ua on l.buyer_id = ua.id
on conflict do nothing;

-- Payment
insert into public.payments (order_id, user_id, amount, currency, status)
select o.id, o.buyer_id, o.price, 'TRY', 'pending' from public.orders o
on conflict do nothing;
