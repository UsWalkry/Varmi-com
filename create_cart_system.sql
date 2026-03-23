-- Shopping Cart System
-- Sepet sistemi için tablolar

-- 1. Carts table - Kullanıcı sepetleri
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_cart (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cart Items table - Sepetteki ürünler
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) PRIMARY KEY,
  cart_id VARCHAR(36) NOT NULL,
  listing_id VARCHAR(36) NOT NULL,
  offer_id VARCHAR(36) NOT NULL,
  quantity INT DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_listing_per_cart (cart_id, listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for performance
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_listing ON cart_items(listing_id);
CREATE INDEX idx_cart_items_offer ON cart_items(offer_id);
CREATE INDEX idx_carts_user ON carts(user_id);

-- Cart item details view - Sepet içeriği detaylı görünüm
CREATE OR REPLACE VIEW v_cart_details AS
SELECT 
  ci.id as cart_item_id,
  ci.cart_id,
  ci.quantity,
  ci.added_at,
  c.user_id,
  l.id as listing_id,
  l.title as listing_title,
  l.images as listing_images,
  l.city as listing_city,
  l.category as listing_category,
  o.id as offer_id,
  o.price as offer_amount,
  o.product_name as offer_product_name,
  o.images as offer_images,
  o.seller_id,
  o.delivery_type,
  o.shipping_cost,
  o.description as offer_description,
  CONCAT(u.firstName, ' ', u.lastName) as seller_name,
  u.email as seller_email,
  (o.price * ci.quantity) as subtotal,
  ((o.price * ci.quantity) + COALESCE(o.shipping_cost, 0)) as total_with_shipping
FROM cart_items ci
JOIN carts c ON ci.cart_id = c.id
JOIN listings l ON ci.listing_id = l.id
JOIN offers o ON ci.offer_id = o.id
JOIN users u ON o.seller_id = u.id
WHERE o.status = 'active' 
  AND o.approval_status = 'approved'
  AND l.status = 'active'
  AND l.approval_status = 'approved';
