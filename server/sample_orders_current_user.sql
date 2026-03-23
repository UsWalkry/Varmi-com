-- Sample order for current user (6dca2abb-12e0-4439-8f80-f83c6fbdb961)

-- Insert sample orders
INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, tracking_number, estimated_delivery, order_number, payment_status) VALUES
('order-current-1', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'shipped', 2339.98, 15.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', 'PT123456789', '2025-01-25', 'ORD001234', 'paid'),
('order-current-2', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'preparing', 599.99, 9.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', NULL, '2025-01-22', 'ORD001235', 'paid'),
('order-current-3', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'delivered', 1249.97, 12.99, 'Test Mahallesi, Test Caddesi No:123, Beşiktaş/İstanbul', 'YK555444333', '2025-01-19', 'ORD001236', 'paid');

-- Insert sample order items
INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
('order-current-1', 'listing-1', 'Trina Profesyonel Tırnak Törpü Makinesi', 'Profesyonel salon kalitesinde tırnak törpü makinesi', 1589.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-current-1', 'listing-2', 'Salon Kalitesi Tırnak Bakım Seti', 'Komple tırnak bakım seti', 749.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-current-2', 'listing-3', 'Profesyonel Saç Kurutma Makinesi', 'Yüksek güçlü profesyonel saç kurutma makinesi', 599.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-current-3', 'listing-4', 'Organik Bebek Bakım Seti', 'Doğal organik bebek bakım ürünleri', 299.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-current-3', 'listing-5', 'Doğal Bebek Şampuanı', 'Kimyasal içermeyen bebek şampuanı', 149.99, 2, '/uploads/1759945986971-520998012.jpg'),
('order-current-3', 'listing-6', 'Bebek Banyo Havlusu Seti', 'Yumuşak organik pamuklu havlu seti', 799.99, 1, '/uploads/1759945986971-520998012.jpg');

-- Insert sample tracking data
INSERT IGNORE INTO order_tracking (order_id, status, description) VALUES
('order-current-1', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı ve işleme konuldu'),
('order-current-1', 'Hazırlanıyor', 'Siparişiniz ambalajlanıyor'),
('order-current-1', 'Kargoya Verildi', 'Siparişiniz PTT Kargo\'ya teslim edildi'),
('order-current-2', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı'),
('order-current-2', 'Hazırlanıyor', 'Siparişiniz hazırlanıyor'),
('order-current-3', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı'),
('order-current-3', 'Hazırlanıyor', 'Siparişiniz hazırlandı'),
('order-current-3', 'Kargoya Verildi', 'Siparişiniz kargoya verildi'),
('order-current-3', 'Teslim Edildi', 'Siparişiniz başarıyla teslim edildi');

-- Insert sample seller data (make current user also a seller for testing sales)
INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
('order-current-1', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'John Doe (Test)', 'john@example.com'),
('order-current-2', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'John Doe (Test)', 'john@example.com'),
('order-current-3', '6dca2abb-12e0-4439-8f80-f83c6fbdb961', 'John Doe (Test)', 'john@example.com');

SELECT 'Sample orders created for current user!' as message;