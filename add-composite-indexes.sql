-- ⚡ ADDITIONAL HIGH-TRAFFIC OPTIMIZATIONS
-- Composite indexes for common query patterns

-- 🎯 LISTINGS - Filtering combinations
-- Category + city + status (location-based category browsing)
CREATE INDEX idx_listings_category_city_status 
ON listings(category, city, status, approval_status);

-- Budget range queries with status
CREATE INDEX idx_listings_budget_status 
ON listings(budget_max, status, approval_status);

-- 🎯 OFFERS - Common query patterns
-- Seller + status (seller's active offers)
CREATE INDEX idx_offers_seller_status_created 
ON offers(seller_id, status, created_at DESC);

-- Amount sorting with status
CREATE INDEX idx_offers_amount_status 
ON offers(listing_id, amount, status);

-- 🎯 ORDERS - Dashboard queries
-- Buyer + status + created (buyer order history)
CREATE INDEX idx_orders_buyer_status_created 
ON orders(buyer_id, status, created_at DESC);

-- Seller + status + created (seller order management)
CREATE INDEX idx_orders_seller_status_created 
ON orders(seller_id, status, created_at DESC);

-- 🎯 NOTIFICATIONS - Performance improvement
-- Composite for unread notifications query
CREATE INDEX idx_notifications_user_read_created 
ON notifications(user_id, is_read, created_at DESC);

-- 🎯 FAVORITES - With listing status check
-- When showing favorites, we JOIN with listings to check if still active
-- This covering index helps that query
CREATE INDEX idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

-- ✅ Additional indexes complete
