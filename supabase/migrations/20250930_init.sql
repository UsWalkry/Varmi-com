-- Supabase PostgreSQL schema for Varmı
-- Extensions
create extension if not exists pgcrypto;

-- Users table references auth.users(id)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  email text unique not null,
  name text not null,
  city text,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- Listings
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  images jsonb not null default '[]'::jsonb,
  category text not null,
  budget_max numeric not null check (budget_max > 0),
  condition text not null check (condition in ('new','used','any')),
  city text not null,
  delivery_type text not null check (delivery_type in ('shipping','pickup','both')),
  buyer_id uuid not null references public.users (id) on delete cascade,
  offers_public boolean not null default true,
  offers_purchasable boolean not null default true,
  status text not null default 'active' check (status in ('active','closed','expired')),
  expires_at timestamptz,
  offer_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Offers
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  seller_name text,
  seller_rating numeric,
  price numeric not null check (price > 0),
  quantity integer not null default 1 check (quantity > 0),
  images jsonb not null default '[]'::jsonb,
  condition text check (condition in ('new','used')),
  product_name text,
  brand text,
  model text,
  description text,
  delivery_type text check (delivery_type in ('shipping','pickup')),
  shipping_desi text,
  shipping_cost numeric,
  eta_days integer,
  status text not null default 'active' check (status in ('active','accepted','rejected','withdrawn')),
  accepted_at timestamptz,
  order_stage text check (order_stage in ('received','carrierSelected','shipped','delivered','completed')),
  tracking_no text,
  order_notes text,
  order_updated_at timestamptz,
  shipping_carrier_id text,
  shipping_carrier_name text,
  shipping_extra_fee numeric,
  completed_at timestamptz,
  valid_until timestamptz,
  message text,
  sold_to_others integer not null default 0,
  owner_purchased_quantity integer,
  created_at timestamptz not null default now()
);

-- Orders (3rd party or owner purchases)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  source_offer_id uuid references public.offers (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  seller_id uuid references public.users (id) on delete set null,
  buyer_id uuid references public.users (id) on delete set null,
  price numeric not null,
  quantity integer not null default 1,
  shipping_cost numeric not null default 0,
  delivery_type text check (delivery_type in ('shipping','pickup')),
  shipping_desi text,
  accepted_at timestamptz not null default now(),
  order_stage text not null default 'received' check (order_stage in ('received','carrierSelected','shipped','delivered','completed')),
  tracking_no text,
  order_updated_at timestamptz not null default now(),
  shipping_carrier_id text,
  shipping_carrier_name text,
  shipping_extra_fee numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  to_user_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('offer_received','offer_purchased','message_received','order_updated')),
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Payments (dummy)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  user_id uuid references public.users (id) on delete set null,
  amount numeric not null,
  currency text not null default 'TRY',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_listings_buyer on public.listings (buyer_id);
create index if not exists idx_offers_listing on public.offers (listing_id);
create index if not exists idx_offers_seller on public.offers (seller_id);
create index if not exists idx_orders_buyer on public.orders (buyer_id);
create index if not exists idx_orders_seller on public.orders (seller_id);
create index if not exists idx_messages_to on public.messages (to_user_id);
create index if not exists idx_messages_from on public.messages (from_user_id);
create index if not exists idx_notifications_user on public.notifications (user_id);

-- Uniqueness: one offer per seller per listing
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uniq_offers_listing_seller'
  ) then
    create unique index uniq_offers_listing_seller on public.offers (listing_id, seller_id);
  end if;
end $$;

-- RLS
alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;

-- Helper: check if current auth user is admin
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists(
    select 1 from public.users u where u.auth_user_id = auth.uid() and u.role = 'admin'
  );
$$;

-- Policies
-- users: self can select/update; insert only own row; admin can do all
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (
    auth.uid() = auth_user_id or public.is_admin()
  );
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert with check (
    auth.uid() = auth_user_id or public.is_admin()
  );
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (
    auth.uid() = auth_user_id or public.is_admin()
  );
drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin on public.users
  for delete using (
    public.is_admin()
  );

-- listings: public select; owner update/delete; owner insert
drop policy if exists listings_select_public on public.listings;
create policy listings_select_public on public.listings
  for select using (true);
drop policy if exists listings_insert_owner on public.listings;
create policy listings_insert_owner on public.listings
  for insert with check (
    exists(select 1 from public.users u where u.id = buyer_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists listings_update_owner on public.listings;
create policy listings_update_owner on public.listings
  for update using (
    exists(select 1 from public.users u where u.id = buyer_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists listings_delete_owner on public.listings;
create policy listings_delete_owner on public.listings
  for delete using (
    exists(select 1 from public.users u where u.id = buyer_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );

-- offers: only seller and listing owner can select; seller insert/update/delete own
drop policy if exists offers_select_parties on public.offers;
create policy offers_select_parties on public.offers
  for select using (
    exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid())
    or exists(select 1 from public.listings l join public.users bu on bu.id = l.buyer_id where l.id = listing_id and bu.auth_user_id = auth.uid())
    or public.is_admin()
  );
-- if listing.offers_public is true, allow public select
drop policy if exists offers_select_public on public.offers;
create policy offers_select_public on public.offers
  for select using (
    exists(select 1 from public.listings l where l.id = listing_id and l.offers_public = true)
  );
drop policy if exists offers_insert_seller on public.offers;
create policy offers_insert_seller on public.offers
  for insert with check (
    exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists offers_update_seller on public.offers;
create policy offers_update_seller on public.offers
  for update using (
    exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists offers_delete_seller on public.offers;
create policy offers_delete_seller on public.offers
  for delete using (
    exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid()) or public.is_admin()
  );

-- orders: only buyer and seller
drop policy if exists orders_select_parties on public.orders;
create policy orders_select_parties on public.orders
  for select using (
    exists(select 1 from public.users bu where bu.id = buyer_id and bu.auth_user_id = auth.uid())
    or exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid())
    or public.is_admin()
  );
drop policy if exists orders_cud_parties on public.orders;
create policy orders_cud_parties on public.orders
  for all using (
    exists(select 1 from public.users bu where bu.id = buyer_id and bu.auth_user_id = auth.uid())
    or exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid())
    or public.is_admin()
  ) with check (
    exists(select 1 from public.users bu where bu.id = buyer_id and bu.auth_user_id = auth.uid())
    or exists(select 1 from public.users su where su.id = seller_id and su.auth_user_id = auth.uid())
    or public.is_admin()
  );

-- messages: only sender or recipient
drop policy if exists messages_select_parties on public.messages;
create policy messages_select_parties on public.messages
  for select using (
    exists(select 1 from public.users fu where fu.id = from_user_id and fu.auth_user_id = auth.uid())
    or exists(select 1 from public.users tu where tu.id = to_user_id and tu.auth_user_id = auth.uid())
    or public.is_admin()
  );
drop policy if exists messages_cud_sender on public.messages;
create policy messages_cud_sender on public.messages
  for all using (
    exists(select 1 from public.users fu where fu.id = from_user_id and fu.auth_user_id = auth.uid()) or public.is_admin()
  ) with check (
    exists(select 1 from public.users fu where fu.id = from_user_id and fu.auth_user_id = auth.uid()) or public.is_admin()
  );

-- notifications: only recipient user
drop policy if exists notifications_select_owner on public.notifications;
create policy notifications_select_owner on public.notifications
  for select using (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists notifications_cud_owner on public.notifications;
create policy notifications_cud_owner on public.notifications
  for all using (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  ) with check (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );

-- payments: only owner (and admin)
drop policy if exists payments_select_owner on public.payments;
create policy payments_select_owner on public.payments
  for select using (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );
drop policy if exists payments_cud_owner on public.payments;
create policy payments_cud_owner on public.payments
  for all using (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  ) with check (
    exists(select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()) or public.is_admin()
  );

-- ==== Triggers & Functions ====
-- Increment offer_count on listings when offer inserted; decrement on delete
create or replace function public.trg_offers_after_insert()
returns trigger language plpgsql as $$
begin
  update public.listings set offer_count = offer_count + 1 where id = new.listing_id;
  -- notification to listing owner
  insert into public.notifications(user_id, type, payload)
  select l.buyer_id, 'offer_received', jsonb_build_object('listing_id', l.id, 'offer_id', new.id, 'price', new.price)
  from public.listings l where l.id = new.listing_id;
  return new;
end;$$;

drop trigger if exists offers_after_insert on public.offers;
create trigger offers_after_insert
after insert on public.offers
for each row execute function public.trg_offers_after_insert();

create or replace function public.trg_offers_after_delete()
returns trigger language plpgsql as $$
begin
  update public.listings set offer_count = greatest(0, offer_count - 1) where id = old.listing_id;
  return old;
end;$$;

drop trigger if exists offers_after_delete on public.offers;
create trigger offers_after_delete
after delete on public.offers
for each row execute function public.trg_offers_after_delete();

-- Messages: notify recipient
create or replace function public.trg_messages_after_insert()
returns trigger language plpgsql as $$
begin
  insert into public.notifications(user_id, type, payload)
  values (new.to_user_id, 'message_received', jsonb_build_object('listing_id', new.listing_id, 'from', new.from_user_id, 'message_id', new.id));
  return new;
end;$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
after insert on public.messages
for each row execute function public.trg_messages_after_insert();

-- Orders: notify buyer and seller
create or replace function public.trg_orders_after_insert()
returns trigger language plpgsql as $$
begin
  if new.seller_id is not null then
    insert into public.notifications(user_id, type, payload)
    values (new.seller_id, 'order_updated', jsonb_build_object('order_id', new.id, 'stage', new.order_stage));
  end if;
  if new.buyer_id is not null then
    insert into public.notifications(user_id, type, payload)
    values (new.buyer_id, 'order_updated', jsonb_build_object('order_id', new.id, 'stage', new.order_stage));
  end if;
  return new;
end;$$;

drop trigger if exists orders_after_insert on public.orders;
create trigger orders_after_insert
after insert on public.orders
for each row execute function public.trg_orders_after_insert();

-- Ensure current user exists in public.users and return its id
create or replace function public.get_or_create_current_user() returns uuid
language plpgsql as $$
declare uid uuid; email text; uname text; rec public.users%rowtype;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'auth.uid() is null';
  end if;
  select * into rec from public.users where auth_user_id = uid limit 1;
  if found then
    return rec.id;
  else
    begin
      email := coalesce((auth.jwt() ->> 'email'), concat(uid::text, '@local')); 
      uname := split_part(email, '@', 1);
      insert into public.users(auth_user_id, email, name, city)
      values (uid, email, uname, 'İstanbul')
      returning id into rec.id;
      return rec.id;
    exception when unique_violation then
      select id into rec.id from public.users where auth_user_id = uid limit 1;
      return rec.id;
    end;
  end if;
end $$;

-- BEFORE INSERT helpers to set user linkage
create or replace function public.trg_listings_before_insert()
returns trigger language plpgsql as $$
begin
  if new.buyer_id is null then
    new.buyer_id := public.get_or_create_current_user();
  end if;
  return new;
end $$;

drop trigger if exists listings_before_insert on public.listings;
create trigger listings_before_insert
before insert on public.listings
for each row execute function public.trg_listings_before_insert();

create or replace function public.trg_offers_before_insert()
returns trigger language plpgsql as $$
begin
  if new.seller_id is null then
    new.seller_id := public.get_or_create_current_user();
  end if;
  return new;
end $$;

drop trigger if exists offers_before_insert on public.offers;
create trigger offers_before_insert
before insert on public.offers
for each row execute function public.trg_offers_before_insert();

create or replace function public.trg_messages_before_insert()
returns trigger language plpgsql as $$
begin
  if new.from_user_id is null then
    new.from_user_id := public.get_or_create_current_user();
  end if;
  return new;
end $$;

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert
before insert on public.messages
for each row execute function public.trg_messages_before_insert();

create or replace function public.trg_orders_before_insert()
returns trigger language plpgsql as $$
begin
  if new.buyer_id is null then
    new.buyer_id := public.get_or_create_current_user();
  end if;
  if new.seller_id is null and new.source_offer_id is not null then
    select seller_id into new.seller_id from public.offers where id = new.source_offer_id;
  end if;
  return new;
end $$;

drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert
before insert on public.orders
for each row execute function public.trg_orders_before_insert();

create or replace function public.trg_payments_before_insert()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := public.get_or_create_current_user();
  end if;
  return new;
end $$;

drop trigger if exists payments_before_insert on public.payments;
create trigger payments_before_insert
before insert on public.payments
for each row execute function public.trg_payments_before_insert();

-- RPC: owner accepts an offer (status/order_stage update + quantity)
create or replace function public.accept_offer_owner(p_offer_id uuid, p_owner_qty int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_listing_id uuid; v_owner uuid; v_self uuid;
begin
  select listing_id into v_listing_id from public.offers where id = p_offer_id;
  if v_listing_id is null then
    raise exception 'Offer not found';
  end if;
  v_self := public.get_or_create_current_user();
  select buyer_id into v_owner from public.listings where id = v_listing_id;
  if v_owner is null or v_owner <> v_self then
    raise exception 'Not authorized';
  end if;
  update public.offers
     set status = 'accepted',
         order_stage = 'received',
         owner_purchased_quantity = greatest(1, coalesce(p_owner_qty, 1)),
         accepted_at = now(),
         order_updated_at = now()
   where id = p_offer_id;
end;$$;

-- RPC: mark messages as read for current user against a specific other user and optional listing
create or replace function public.mark_messages_read(p_listing_id uuid, p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_self uuid;
begin
  v_self := public.get_or_create_current_user();
  update public.messages m
    set read = true
  where m.to_user_id = v_self
    and (p_listing_id is null or m.listing_id = p_listing_id)
    and m.from_user_id = p_other_user_id;
end;$$;
