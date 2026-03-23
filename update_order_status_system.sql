-- Updated Orders System with Enhanced Status Management
-- This script updates the orders tables to support the new workflow

-- Update orders table to include new status values and fields
ALTER TABLE orders 
MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'completed', 'cancelled') DEFAULT 'pending';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending' AFTER status;

-- Add new fields for shipping management
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS carrier_company VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS estimated_delivery DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS started_processing_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL;

-- Update order_tracking table to support order-level tracking (not just order_item level)
ALTER TABLE order_tracking 
ADD COLUMN IF NOT EXISTS order_id BIGINT DEFAULT NULL AFTER id,
ADD INDEX IF NOT EXISTS idx_order_id_tracking (order_id),
ADD FOREIGN KEY IF NOT EXISTS fk_order_tracking_order (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- Make order_item_id nullable since we now support order-level tracking too
ALTER TABLE order_tracking 
MODIFY COLUMN order_item_id BIGINT DEFAULT NULL;

-- Create audit log table for order status changes
CREATE TABLE IF NOT EXISTS order_status_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT NOT NULL,
    change_reason TEXT,
    tracking_number VARCHAR(100),
    carrier_company VARCHAR(100),
    estimated_delivery DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_id_audit (order_id),
    INDEX idx_changed_by (changed_by),
    INDEX idx_created_at_audit (created_at),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create table for order notifications
CREATE TABLE IF NOT EXISTS order_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    notification_type ENUM('status_change', 'shipping_info', 'delivery_reminder', 'completion_request') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_notifications_order (order_id),
    INDEX idx_order_notifications_user (user_id),
    INDEX idx_order_notifications_type (notification_type),
    INDEX idx_order_notifications_read (is_read),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Store user-to-user reviews linked to orders
CREATE TABLE IF NOT EXISTS user_reviews (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    offer_id VARCHAR(64) NULL,
    listing_id VARCHAR(64) NULL,
    reviewer_id VARCHAR(64) NOT NULL,
    reviewee_id VARCHAR(64) NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_order_reviewer (order_id, reviewer_id),
    INDEX idx_reviewee (reviewee_id),
    INDEX idx_reviewer (reviewer_id),
    INDEX idx_order (order_id)
);

-- Add some sample status transitions for testing
INSERT INTO order_status_audit (order_id, previous_status, new_status, changed_by, change_reason) 
SELECT 
    o.id, 
    'pending', 
    o.status, 
    o.user_id, 
    'Initial status from existing orders'
FROM orders o 
WHERE NOT EXISTS (
    SELECT 1 FROM order_status_audit osa WHERE osa.order_id = o.id
);