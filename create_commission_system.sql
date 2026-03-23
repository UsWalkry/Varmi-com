-- ============================================
-- Komisyon Sistemi Database Schema
-- ============================================
-- Bu dosya komisyon sistemini oluşturur:
-- 1. users tablosuna commission_balance eklenir
-- 2. orders tablosuna commission alanları eklenir
-- 3. commission_transactions tablosu oluşturulur
-- 4. commission_withdrawal_requests tablosu oluşturulur
-- 5. site_settings tablosu (komisyon oranları için)
-- ============================================

USE varmi_db;

-- ============================================
-- 1. users tablosuna komisyon bakiyesi ekle
-- ============================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS commission_balance DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Kullanıcının kazandığı toplam komisyon bakiyesi',
ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Kullanıcının tüm zamanlarda kazandığı toplam komisyon',
ADD COLUMN IF NOT EXISTS total_commission_withdrawn DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Kullanıcının çektiği toplam komisyon';

-- ============================================
-- 2. orders tablosuna gerekli kolonlar ve komisyon alanları ekle
-- ============================================
-- Önce gerekli ID kolonlarını ekle (varsa skip)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS buyer_id VARCHAR(36) COMMENT 'Alıcı (sipariş veren kullanıcı)',
ADD COLUMN IF NOT EXISTS seller_id VARCHAR(36) COMMENT 'Satıcı (teklif sahibi)',
ADD COLUMN IF NOT EXISTS listing_id VARCHAR(36) COMMENT 'İlan ID',
ADD COLUMN IF NOT EXISTS source_offer_id VARCHAR(36) COMMENT 'Kaynak teklif ID';

-- Index ekle
ALTER TABLE orders
ADD INDEX IF NOT EXISTS idx_buyer (buyer_id),
ADD INDEX IF NOT EXISTS idx_seller (seller_id),
ADD INDEX IF NOT EXISTS idx_listing (listing_id),
ADD INDEX IF NOT EXISTS idx_offer (source_offer_id);

-- Komisyon kolonlarını ekle
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS commission_to_listing_owner DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'İlan sahibine verilen komisyon (alıcı)',
ADD COLUMN IF NOT EXISTS commission_to_seller DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Teklif sahibine verilen komisyon (satıcı)',
ADD COLUMN IF NOT EXISTS commission_rate_listing DECIMAL(5, 2) DEFAULT 5.00 COMMENT 'İlan sahibi komisyon oranı (%)',
ADD COLUMN IF NOT EXISTS commission_rate_seller DECIMAL(5, 2) DEFAULT 5.00 COMMENT 'Satıcı komisyon oranı (%)',
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE COMMENT 'Komisyon ödenmiş mi?',
ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMP NULL COMMENT 'Komisyon ödenme tarihi',
ADD COLUMN IF NOT EXISTS commission_used DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Alışverişte kullanılan komisyon bakiyesi';

-- ============================================
-- 3. Komisyon işlem geçmişi tablosu
-- ============================================
DROP TABLE IF EXISTS commission_transactions;
CREATE TABLE commission_transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT 'Komisyon alan kullanıcı',
    order_id VARCHAR(36) NOT NULL COMMENT 'İlgili sipariş',
    transaction_type ENUM('earned', 'withdrawn') NOT NULL COMMENT 'İşlem tipi: kazanıldı veya çekildi',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'İşlem tutarı',
    description TEXT COMMENT 'İşlem açıklaması',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_transactions (user_id, created_at DESC),
    INDEX idx_order_transactions (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Komisyon kazanma ve çekme işlemlerinin geçmişi';

-- ============================================
-- 4. Komisyon çekim talepleri tablosu
-- ============================================
DROP TABLE IF EXISTS commission_withdrawal_requests;
CREATE TABLE commission_withdrawal_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL COMMENT 'Çekim talebinde bulunan kullanıcı',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Çekilmek istenen tutar',
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT 'Talep durumu',
    
    -- Banka bilgileri
    bank_name VARCHAR(100) COMMENT 'Banka adı',
    iban VARCHAR(34) COMMENT 'IBAN numarası',
    account_holder_name VARCHAR(100) COMMENT 'Hesap sahibi adı',
    
    -- İşlem bilgileri
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Talep tarihi',
    processed_at TIMESTAMP NULL COMMENT 'İşlenme tarihi',
    processed_by VARCHAR(36) NULL COMMENT 'İşleyen admin ID',
    rejection_reason TEXT COMMENT 'Red nedeni',
    admin_notes TEXT COMMENT 'Admin notları',
    
    -- Transfer bilgileri
    transfer_reference VARCHAR(100) COMMENT 'Havale referans numarası',
    transfer_date DATE COMMENT 'Havale tarihi',
    
    INDEX idx_user_withdrawals (user_id, requested_at DESC),
    INDEX idx_status (status, requested_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Kullanıcıların komisyon çekim talepleri';

-- ============================================
-- 5. Site ayarları tablosu (komisyon oranları)
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'Ayar anahtarı',
    setting_value TEXT NOT NULL COMMENT 'Ayar değeri',
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT 'Değer tipi',
    description TEXT COMMENT 'Ayar açıklaması',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36) NULL COMMENT 'Güncelleyen admin ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Site geneli ayarlar (komisyon oranları, limitler vb)';

-- ============================================
-- Varsayılan site ayarlarını ekle
-- ============================================
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
('commission_rate_listing_owner', '5.00', 'number', 'İlan sahibine verilen komisyon oranı (%)'),
('commission_rate_seller', '5.00', 'number', 'Teklif sahibine verilen komisyon oranı (%)'),
('commission_min_withdrawal', '100.00', 'number', 'Minimum çekim tutarı (TL)'),
('commission_max_withdrawal', '10000.00', 'number', 'Maksimum çekim tutarı (TL)'),
('commission_enabled', 'true', 'boolean', 'Komisyon sistemi aktif mi?')
ON DUPLICATE KEY UPDATE setting_key = setting_key; -- Skip if already exists

-- ============================================
-- İstatistik view'ı - komisyon özeti
-- ============================================
DROP VIEW IF EXISTS commission_stats;
CREATE VIEW commission_stats AS
SELECT 
    u.id as user_id,
    u.email,
    CONCAT(u.firstName, ' ', u.lastName) COLLATE utf8mb4_general_ci as full_name,
    u.commission_balance,
    u.total_commission_earned,
    u.total_commission_withdrawn,
    COUNT(DISTINCT ct.id) as total_transactions,
    COUNT(DISTINCT CASE WHEN ct.transaction_type = 'earned' THEN ct.id END) as earned_count,
    COUNT(DISTINCT CASE WHEN ct.transaction_type = 'withdrawn' THEN ct.id END) as withdrawn_count,
    COUNT(DISTINCT cwr.id) as withdrawal_requests,
    COUNT(DISTINCT CASE WHEN cwr.status = 'pending' THEN cwr.id END) as pending_withdrawals
FROM users u
LEFT JOIN commission_transactions ct ON u.id = ct.user_id COLLATE utf8mb4_general_ci
LEFT JOIN commission_withdrawal_requests cwr ON u.id = cwr.user_id COLLATE utf8mb4_general_ci
WHERE u.commission_balance > 0 OR u.total_commission_earned > 0
GROUP BY u.id;

-- ============================================
-- Tetikleyici: Order completed olduğunda komisyon öde
-- ============================================
-- NOT: Trigger yerine backend'de manuel olarak komisyon ödeme yapılacak
-- commissionService.payCommissionForOrder() fonksiyonu kullanılacak

-- ============================================
-- Test verileri (isteğe bağlı)
-- ============================================
-- Mevcut completed siparişlere komisyon ekle (eğer daha önce eklenmemişse)
-- UPDATE orders 
-- SET 
--     commission_to_listing_owner = (price * 0.05),
--     commission_to_seller = (price * 0.05),
--     commission_rate_listing = 5.00,
--     commission_rate_seller = 5.00
-- WHERE status = 'completed' AND commission_paid = FALSE;

SELECT '✅ Komisyon sistemi başarıyla oluşturuldu!' as Status;
SELECT 'Trigger aktif - completed siparişlerde otomatik komisyon ödenecek' as Info;
