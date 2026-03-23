-- MySQL Orders System Setup
-- Run this file to create orders tables and sample data

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  shipping_address TEXT NOT NULL,
  tracking_number VARCHAR(100),
  estimated_delivery DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  listing_id VARCHAR(36) NOT NULL,
  offer_id VARCHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL
);

-- Create order_tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  status VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create order_sellers table  
CREATE TABLE IF NOT EXISTS order_sellers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample orders
INSERT IGNORE INTO orders (id, user_id, status, total_amount, shipping_cost, shipping_address, tracking_number, estimated_delivery) VALUES
('order-1', 'f92b5cb2-c657-4f5b-af25-f6f0e50c27dc', 'shipped', 2339.98, 15.99, 'Atatürk Mahallesi, Cumhuriyet Caddesi No:123, Beşiktaş/İstanbul', 'PT123456789', '2025-10-14'),
('order-2', 'f92b5cb2-c657-4f5b-af25-f6f0e50c27dc', 'preparing', 599.99, 9.99, 'Atatürk Mahallesi, Cumhuriyet Caddesi No:123, Beşiktaş/İstanbul', 'AR987654321', '2025-10-12'),
('order-3', 'f92b5cb2-c657-4f5b-af25-f6f0e50c27dc', 'delivered', 1249.97, 12.99, 'Atatürk Mahallesi, Cumhuriyet Caddesi No:123, Beşiktaş/İstanbul', 'YK555444333', '2025-10-09');

-- Insert sample order items
INSERT IGNORE INTO order_items (order_id, listing_id, title, description, price, quantity, image) VALUES
('order-1', 'listing-1', 'Trina Profesyonel Tırnak Törpü Makinesi', 'Profesyonel salon kalitesinde tırnak törpü makinesi', 1589.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-1', 'listing-2', 'Salon Kalitesi Tırnak Bakım Seti', 'Komple tırnak bakım seti', 749.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-2', 'listing-3', 'Profesyonel Saç Kurutma Makinesi', 'Yüksek güçlü profesyonel saç kurutma makinesi', 599.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-3', 'listing-4', 'Organik Bebek Bakım Seti', 'Doğal organik bebek bakım ürünleri', 299.99, 1, '/uploads/1759945986971-520998012.jpg'),
('order-3', 'listing-5', 'Doğal Bebek Şampuanı', 'Kimyasal içermeyen bebek şampuanı', 149.99, 2, '/uploads/1759945986971-520998012.jpg'),
('order-3', 'listing-6', 'Bebek Banyo Havlusu Seti', 'Yumuşak organik pamuklu havlu seti', 799.99, 1, '/uploads/1759945986971-520998012.jpg');

-- Insert sample tracking data
INSERT IGNORE INTO order_tracking (order_id, status, description) VALUES
('order-1', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı ve işleme konuldu'),
('order-1', 'Hazırlanıyor', 'Siparişiniz ambalajlanıyor'),
('order-1', 'Kargoya Verildi', 'Siparişiniz PTT Kargo\'ya teslim edildi'),
('order-2', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı'),
('order-2', 'Hazırlanıyor', 'Siparişiniz hazırlanıyor'),
('order-3', 'Sipariş Alındı', 'Siparişiniz başarıyla alındı'),
('order-3', 'Hazırlanıyor', 'Siparişiniz hazırlandı'),
('order-3', 'Kargoya Verildi', 'Siparişiniz kargoya verildi'),
('order-3', 'Teslim Edildi', 'Siparişiniz başarıyla teslim edildi');

-- Insert sample seller data
INSERT IGNORE INTO order_sellers (order_id, seller_id, seller_name, seller_email) VALUES
('order-1', 'seller-1', 'Mehmet Yılmaz', 'mehmet@example.com'),
('order-2', 'seller-2', 'Ayşe Demir', 'ayse@example.com'),
('order-3', 'seller-3', 'Fatma Özkan', 'fatma@example.com');

SELECT 'Orders tables created successfully!' as message;