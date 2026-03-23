-- Offer Approval System - Admin onayı bekleyen teklifler sistemi
-- Bu script offers tablosuna admin onay sistemi ekler

-- 1. offers tablosuna yeni alanlar ekle (MySQL 5.7 uyumlu)
-- Önce kolonların var olup olmadığını kontrol et, yoksa ekle
SET @dbname = DATABASE();

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'approval_status') = 0,
    'ALTER TABLE offers ADD COLUMN approval_status ENUM(''pending'', ''approved'', ''rejected'') DEFAULT ''pending'' AFTER status',
    'SELECT ''Column approval_status already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'approved_by') = 0,
    'ALTER TABLE offers ADD COLUMN approved_by VARCHAR(36) NULL AFTER approval_status',
    'SELECT ''Column approved_by already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'approved_at') = 0,
    'ALTER TABLE offers ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by',
    'SELECT ''Column approved_at already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'rejection_reason') = 0,
    'ALTER TABLE offers ADD COLUMN rejection_reason TEXT NULL AFTER approved_at',
    'SELECT ''Column rejection_reason already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index'leri ekle (var olan index'leri tekrar eklemeye çalışırsa hata vermeyecek)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND INDEX_NAME = 'idx_approval_status') = 0,
    'ALTER TABLE offers ADD INDEX idx_approval_status (approval_status)',
    'SELECT ''Index idx_approval_status already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'offers' AND INDEX_NAME = 'idx_approved_by') = 0,
    'ALTER TABLE offers ADD INDEX idx_approved_by (approved_by)',
    'SELECT ''Index idx_approved_by already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Mevcut aktif teklifleri otomatik onayla (migration için)
UPDATE offers 
SET approval_status = 'approved', 
    approved_at = created_at 
WHERE status = 'active' AND approval_status = 'pending';

-- 3. offer_approval_audit tablosu - onay/red işlemlerinin kaydı
CREATE TABLE IF NOT EXISTS offer_approval_audit (
    id VARCHAR(36) PRIMARY KEY,
    offer_id VARCHAR(36) NOT NULL,
    action ENUM('approved', 'rejected', 'resubmitted') NOT NULL,
    performed_by VARCHAR(36) NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_offer_id (offer_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admin bildirim tablosunu güncelle (offer tipleri ve offer_id ekle)
ALTER TABLE admin_notifications 
MODIFY COLUMN type ENUM('new_listing', 'listing_resubmitted', 'new_offer', 'offer_resubmitted', 'other') NOT NULL;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'admin_notifications' AND COLUMN_NAME = 'offer_id') = 0,
    'ALTER TABLE admin_notifications ADD COLUMN offer_id VARCHAR(36) NULL AFTER listing_id',
    'SELECT ''Column offer_id already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'admin_notifications' AND INDEX_NAME = 'idx_offer_id') = 0,
    'ALTER TABLE admin_notifications ADD INDEX idx_offer_id (offer_id)',
    'SELECT ''Index idx_offer_id already exists'' AS Info'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Görünüm oluştur - Onay bekleyen teklifler (Admin paneli için)
CREATE OR REPLACE VIEW pending_offers_view AS
SELECT 
    o.id,
    o.listing_id,
    o.seller_id,
    o.price,
    o.quantity,
    o.product_name,
    o.description,
    o.offer_condition,
    o.delivery_type,
    o.shipping_cost,
    o.images,
    o.created_at,
    o.approval_status,
    o.status,
    u.email as seller_email,
    u.firstName as seller_first_name,
    u.lastName as seller_last_name,
    u.phone as seller_phone,
    l.title as listing_title,
    l.buyer_id as listing_owner_id,
    buyer.email as listing_owner_email,
    buyer.firstName as listing_owner_first_name,
    buyer.lastName as listing_owner_last_name
FROM offers o
JOIN users u ON o.seller_id = u.id
JOIN listings l ON o.listing_id = l.id
JOIN users buyer ON l.buyer_id = buyer.id
WHERE o.approval_status = 'pending'
ORDER BY o.created_at ASC;

-- Başarılı mesajı
SELECT 'Offer approval system successfully installed!' AS message;
