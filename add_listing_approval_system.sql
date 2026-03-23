-- Listing Approval System - Admin onayı bekleyen ilanlar sistemi
-- Bu script listings tablosuna admin onay sistemi ekler

-- 1. listings tablosuna yeni alanlar ekle
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER status,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36) NULL AFTER approval_status,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER approved_at;

-- Index'leri ayrı ayrı ekle (IF NOT EXISTS desteklenmediği için hata görmezden gelinsin)
ALTER TABLE listings ADD INDEX IF NOT EXISTS idx_approval_status (approval_status);
ALTER TABLE listings ADD INDEX IF NOT EXISTS idx_approved_by (approved_by);

-- 2. Mevcut aktif ilanları otomatik onayla (migration için)
UPDATE listings 
SET approval_status = 'approved', 
    approved_at = created_at 
WHERE status = 'active' AND approval_status = 'pending';

-- 3. listing_approval_audit tablosu - onay/red işlemlerinin kaydı
CREATE TABLE IF NOT EXISTS listing_approval_audit (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    action ENUM('approved', 'rejected', 'resubmitted') NOT NULL,
    performed_by VARCHAR(36) NOT NULL,
    reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_listing_id (listing_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admin bildirim tablosu (opsiyonel - admin'e bildirim göndermek için)
CREATE TABLE IF NOT EXISTS admin_notifications (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('new_listing', 'listing_resubmitted', 'other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    listing_id VARCHAR(36) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Görünüm oluştur - Onay bekleyen ilanlar (Admin paneli için)
CREATE OR REPLACE VIEW pending_listings_view AS
SELECT 
    l.id,
    l.title,
    l.category,
    l.budget_max,
    l.city,
    l.description,
    l.images,
    l.created_at,
    l.approval_status,
    u.id as buyer_id,
    u.email as buyer_email,
    u.firstName as buyer_first_name,
    u.lastName as buyer_last_name,
    u.phone as buyer_phone
FROM listings l
JOIN users u ON l.buyer_id = u.id
WHERE l.approval_status = 'pending'
ORDER BY l.created_at ASC;

-- Başarılı mesajı
SELECT 'Listing approval system successfully installed!' AS message;
