-- Mevcut kullanıcı için orders ekle
-- Current user ID: 7cfaf015-b614-43b0-9774-9cc1cddd3efc

-- Mevcut orders'ları bu kullanıcıya transfer et
UPDATE orders 
SET user_id = '7cfaf015-b614-43b0-9774-9cc1cddd3efc' 
WHERE user_id = 'f92b5cb2-c657-4f5b-af25-f6f0e50c27dc';

-- Yeni bir sipariş de ekleyelim
INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, tracking_number, estimated_delivery) VALUES
('order-4', '7cfaf015-b614-43b0-9774-9cc1cddd3efc', 'delivered', 1500.00, 99.99, 'Test Mahallesi, Test Caddesi No:1, Ankara', 'TEST123456', '2025-10-10');

-- Order items ekle
INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
('order-4', '0e557044-487e-4fd6-a6ad-2b3044d6a49e', 'cgfbfdg Var mı?', 'Test ürün açıklaması', 1500.00, 1, '/uploads/1759945986971-520998012.jpg');

-- Order tracking ekle  
INSERT IGNORE INTO order_tracking (order_id, status, description) VALUES
('order-4', 'confirmed', 'Siparişiniz onaylandı'),
('order-4', 'preparing', 'Siparişiniz hazırlanıyor'),
('order-4', 'shipped', 'Siparişiniz kargoya verildi'),
('order-4', 'delivered', 'Siparişiniz teslim edildi');

-- Order sellers ekle
INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
('order-4', 'f92b5cb2-c657-4f5b-af25-f6f0e50c27dc', 'ali tural', 'ali@example.com');