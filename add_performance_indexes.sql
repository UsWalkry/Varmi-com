-- Performance Index'leri - Varmii.com
-- Oluşturma Tarihi: 2026-02-09
-- Amaç: Query performansını 10x artırmak

USE varmii_com;

-- LISTINGS Tablosu Index'leri
CREATE INDEX idx_listings_buyer_id ON listings(buyer_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_approval_status ON listings(approval_status);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_expires_at ON listings(expires_at);
-- Compound index: En çok kullanılan query kombinasyonu
CREATE INDEX idx_listings_status_approval ON listings(status, approval_status, created_at DESC);
CREATE INDEX idx_listings_buyer_status ON listings(buyer_id, status);

-- OFFERS Tablosu Index'leri
CREATE INDEX idx_offers_listing_id ON offers(listing_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_approval_status ON offers(approval_status);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX idx_offers_valid_until ON offers(valid_until);
-- Compound index
CREATE INDEX idx_offers_listing_status ON offers(listing_id, status, approval_status);
CREATE INDEX idx_offers_seller_status ON offers(seller_id, status);

-- ORDERS Tablosu Index'leri
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
-- Compound index
CREATE INDEX idx_orders_buyer_status ON orders(buyer_id, status, created_at DESC);
CREATE INDEX idx_orders_seller_status ON orders(seller_id, status, created_at DESC);

-- LISTING_COMMENTS Tablosu Index'leri
CREATE INDEX idx_comments_listing_id ON listing_comments(listing_id);
CREATE INDEX idx_comments_user_id ON listing_comments(user_id);
CREATE INDEX idx_comments_parent_id ON listing_comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON listing_comments(created_at DESC);
CREATE INDEX idx_comments_is_visible ON listing_comments(is_visible);
-- Compound index
CREATE INDEX idx_comments_listing_visible ON listing_comments(listing_id, is_visible, created_at DESC);

-- FAVORITES Tablosu Index'leri (composite PK olsa bile query'ler için)
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_listing_id ON favorites(listing_id);

-- USERS Tablosu Index'leri
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- NOTIFICATIONS Tablosu Index'leri
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- COMMISSION_TRANSACTIONS Tablosu Index'leri
CREATE INDEX idx_commission_user_id ON commission_transactions(user_id);
CREATE INDEX idx_commission_order_id ON commission_transactions(order_id);
CREATE INDEX idx_commission_type ON commission_transactions(transaction_type);
CREATE INDEX idx_commission_created_at ON commission_transactions(created_at DESC);

-- ADMIN_NOTIFICATIONS Tablosu Index'leri
CREATE INDEX idx_admin_notif_type ON admin_notifications(type);
CREATE INDEX idx_admin_notif_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notif_created_at ON admin_notifications(created_at DESC);

-- Index'lerin oluşturulduğunu doğrula
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'varmii_com' 
    AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
