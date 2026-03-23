-- Orders System Tables for Varmi.com
-- This script creates the necessary tables for the orders functionality

-- 1. Orders table - Main order information
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('preparing', 'shipped', 'delivered', 'cancelled') DEFAULT 'preparing',
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    estimated_delivery_date DATE NULL,
    shipping_address TEXT,
    billing_address TEXT,
    notes TEXT,
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Order Items table - Individual items in each order
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    offer_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    product_condition ENUM('new', 'used', 'refurbished') DEFAULT 'new',
    images TEXT, -- JSON array of image URLs
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    delivery_status ENUM('pending', 'processing', 'shipped', 'delivered', 'returned') DEFAULT 'pending',
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_offer_id (offer_id),
    INDEX idx_listing_id (listing_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_delivery_status (delivery_status),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Order Tracking table - Detailed tracking information
CREATE TABLE IF NOT EXISTS order_tracking (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_item_id BIGINT NOT NULL,
    status VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    carrier_company VARCHAR(100),
    tracking_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_item_id (order_item_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

-- 4. Seller Information table (for order context)
CREATE TABLE IF NOT EXISTS order_sellers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    seller_name VARCHAR(255) NOT NULL,
    seller_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id (order_id),
    INDEX idx_seller_id (seller_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample data for testing
INSERT INTO orders (order_number, user_id, total_amount, status, payment_status, estimated_delivery_date, created_at) VALUES
('10576431723', 1, 2339.98, 'shipped', 'paid', '2025-10-14', '2025-10-08 10:30:00'),
('10576431722', 1, 599.99, 'preparing', 'paid', '2025-10-12', '2025-10-06 14:20:00'),
('10576431721', 1, 1249.97, 'delivered', 'paid', '2025-10-09', '2025-10-03 09:15:00');

-- Insert sample order items
INSERT INTO order_items (order_id, offer_id, listing_id, seller_id, product_name, price, quantity, product_condition, images, shipping_cost, tracking_number, delivery_status) VALUES
(1, 1, 1, 2, 'Trina Profesyonel Tırnak Törpü Makinesi', 1589.99, 1, 'new', '["image1.jpg"]', 15.00, 'PT123456789', 'shipped'),
(1, 2, 2, 3, 'Salon Kalitesi Tırnak Bakım Seti', 749.99, 1, 'new', '["image2.jpg"]', 10.00, 'PT123456789', 'shipped'),
(2, 3, 3, 4, 'Profesyonel Saç Kurutma Makinesi', 599.99, 1, 'new', '["image3.jpg"]', 20.00, 'AR987654321', 'processing'),
(3, 4, 4, 5, 'Organik Bebek Bakım Seti', 299.99, 1, 'new', '["image4.jpg"]', 8.00, 'YK555444333', 'delivered'),
(3, 5, 5, 5, 'Doğal Bebek Şampuanı', 149.99, 2, 'new', '["image5.jpg"]', 5.00, 'YK555444333', 'delivered'),
(3, 6, 6, 6, 'Bebek Banyo Havlusu Seti', 799.99, 1, 'new', '["image6.jpg"]', 12.00, 'YK555444333', 'delivered');

-- Insert sample tracking information
INSERT INTO order_tracking (order_item_id, status, description, location, carrier_company, tracking_url) VALUES
(1, 'shipped', 'Kargoya verildi', 'İstanbul Depo', 'PTT Kargo', 'https://gonderitakip.ptt.gov.tr'),
(2, 'shipped', 'Kargoya verildi', 'İstanbul Depo', 'PTT Kargo', 'https://gonderitakip.ptt.gov.tr'),
(3, 'processing', 'Hazırlanıyor', 'Ankara Depo', 'Aras Kargo', 'https://kargotakip.aras.com.tr'),
(4, 'delivered', 'Teslim edildi', 'İzmir', 'Yurtiçi Kargo', 'https://www.yurticikargo.com'),
(5, 'delivered', 'Teslim edildi', 'İzmir', 'Yurtiçi Kargo', 'https://www.yurticikargo.com'),
(6, 'delivered', 'Teslim edildi', 'İzmir', 'Yurtiçi Kargo', 'https://www.yurticikargo.com');

-- Insert sample seller information
INSERT INTO order_sellers (order_id, seller_id, seller_name, seller_rating) VALUES
(1, 2, 'Mehmet Yılmaz', 4.8),
(1, 3, 'Ayşe Demir', 4.9),
(2, 4, 'Ali Veli', 4.7),
(3, 5, 'Fatma Özkan', 4.9),
(3, 6, 'Ahmet Kaya', 4.6);