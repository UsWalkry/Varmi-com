-- ⚡ HIGH-TRAFFIC PERFORMANCE INDEXES
-- E-ticaret platformları için kritik indexler
-- Trendyol/Hepsiburada seviyesi trafik için optimize edildi

-- 🎯 LISTINGS TABLE - En çok sorgulanan tablo
-- Status + approval_status kombinasyonu (WHERE status='active' AND approval_status='approved')
CREATE INDEX idx_listings_status_approval 
ON listings(status, approval_status);

-- City filtreleme (lokasyon bazlı aramalar)
CREATE INDEX idx_listings_city 
ON listings(city);

-- Category filtreleme (kategori sayfaları)
CREATE INDEX idx_listings_category 
ON listings(category);

-- Expiry date kontrolü (expired listings temizleme)
CREATE INDEX idx_listings_expires_at 
ON listings(expires_at);

-- Buyer ID (kullanıcının ilanları)
CREATE INDEX idx_listings_buyer 
ON listings(buyer_id);

-- Created_at sıralama (en yeni ilanlar)
CREATE INDEX idx_listings_created 
ON listings(created_at DESC);

-- Composite index: active ilanlar + kategori + şehir (çok kullanılan kombinasyon)
CREATE INDEX idx_listings_active_category_city 
ON listings(status, approval_status, category, city);

-- 🎯 OFFERS TABLE
-- Listing ID (bir ilana gelen teklifler)
CREATE INDEX idx_offers_listing 
ON offers(listing_id);

-- Seller ID (satıcının verdiği teklifler)
CREATE INDEX idx_offers_seller 
ON offers(seller_id);

-- Status + approval_status (active + approved teklifler)
CREATE INDEX idx_offers_status_approval 
ON offers(status, approval_status);

-- Composite: listing + status (bir ilanın aktif teklifleri)
CREATE INDEX idx_offers_listing_status 
ON offers(listing_id, status, approval_status);

-- Created_at sıralama
CREATE INDEX idx_offers_created 
ON offers(created_at DESC);

-- 🎯 ORDERS TABLE
-- Buyer ID (alıcının siparişleri)
CREATE INDEX idx_orders_buyer 
ON orders(buyer_id);

-- Seller ID (satıcının siparişleri)
CREATE INDEX idx_orders_seller 
ON orders(seller_id);

-- Status (sipariş durumu filtreleme)
CREATE INDEX idx_orders_status 
ON orders(status);

-- Listing ID (ilana ait siparişler)
CREATE INDEX idx_orders_listing 
ON orders(listing_id);

-- Created_at sıralama
CREATE INDEX idx_orders_created 
ON orders(created_at DESC);

-- 🎯 USERS TABLE
-- Email (login sorgularında)
CREATE INDEX idx_users_email 
ON users(email);

-- Role (admin sorguları)
CREATE INDEX idx_users_role 
ON users(role);

-- Email verification (doğrulanmamış kullanıcılar)
CREATE INDEX idx_users_email_verified 
ON users(email_verified);

-- 🎯 FAVORITES TABLE
-- User ID (kullanıcının favorileri)
CREATE INDEX idx_favorites_user 
ON favorites(user_id);

-- Listing ID (ilanı favori ekleyenler)
CREATE INDEX idx_favorites_listing 
ON favorites(listing_id);

-- 🎯 NOTIFICATIONS TABLE
-- User ID + is_read (kullanıcının okunmamış bildirimleri)
CREATE INDEX idx_notifications_user_read 
ON notifications(user_id, is_read);

-- Created_at sıralama
CREATE INDEX idx_notifications_created 
ON notifications(created_at DESC);

-- 🎯 LISTING_COMMENTS TABLE
-- Listing ID (ilana ait yorumlar)
CREATE INDEX idx_comments_listing 
ON listing_comments(listing_id);

-- User ID (kullanıcının yorumları)
CREATE INDEX idx_comments_user 
ON listing_comments(user_id);

-- Is_visible (görünür yorumlar)
CREATE INDEX idx_comments_visible 
ON listing_comments(is_visible);

-- Parent comment ID (threaded comments)
CREATE INDEX idx_comments_parent 
ON listing_comments(parent_comment_id);

-- 🎯 COMMISSION_TRANSACTIONS TABLE
-- User ID (kullanıcının komisyon işlemleri)
CREATE INDEX idx_commission_user 
ON commission_transactions(user_id);

-- Transaction type (earned/withdrawn)
CREATE INDEX idx_commission_type 
ON commission_transactions(transaction_type);

-- Created_at sıralama
CREATE INDEX idx_commission_created 
ON commission_transactions(created_at DESC);

-- 🎯 COMMISSION_WITHDRAWAL_REQUESTS TABLE
-- User ID (kullanıcının çekim talepleri)
CREATE INDEX idx_withdrawal_user 
ON commission_withdrawal_requests(user_id);

-- Status (pending/approved/rejected)
CREATE INDEX idx_withdrawal_status 
ON commission_withdrawal_requests(status);

-- 🎯 SUPPORT_TICKETS TABLE
-- Status (open/resolved tickets)
CREATE INDEX idx_support_status 
ON support_tickets(status);

-- User ID (kullanıcının destek talepleri)
CREATE INDEX idx_support_user 
ON support_tickets(user_id);

-- Created_at sıralama
CREATE INDEX idx_support_created 
ON support_tickets(created_at DESC);

-- ✅ Index oluşturma tamamlandı
-- Performance analizi için:
-- SHOW INDEX FROM listings;
-- EXPLAIN SELECT * FROM listings WHERE status='active' AND approval_status='approved';
