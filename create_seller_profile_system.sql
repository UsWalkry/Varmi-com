-- Satıcı Profili Sistemi
-- Kullanıcıların teklif verebilmesi için onaylanmış satıcı profillerine ihtiyaçları var

USE varmi_db;

-- Satıcı Profilleri Tablosu
CREATE TABLE IF NOT EXISTS seller_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  
  -- Mağaza Bilgileri
  store_name VARCHAR(255) NOT NULL,
  store_description TEXT,
  store_logo_url TEXT,
  
  -- Ticari Bilgiler
  business_type ENUM('individual', 'company') NOT NULL,
  tax_office VARCHAR(255),
  tax_number VARCHAR(50),
  company_name VARCHAR(255),
  trade_registry_number VARCHAR(100),
  mersis_number VARCHAR(20),
  
  -- İletişim Bilgileri
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  business_address TEXT,
  business_city VARCHAR(100),
  business_district VARCHAR(100),
  business_postal_code VARCHAR(20),
  
  -- Banka Bilgileri (Opsiyonel)
  bank_name VARCHAR(255),
  iban VARCHAR(50),
  account_holder_name VARCHAR(255),
  
  -- Belgeler (JSON array of file URLs)
  documents TEXT COMMENT 'JSON array: tax_plate, trade_registry, signature_circular, etc.',
  
  -- Onay Durumu
  approval_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by VARCHAR(36),
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  suspended_reason TEXT,
  suspended_at TIMESTAMP NULL,
  
  -- Satıcı İstatistikleri
  total_offers INT DEFAULT 0,
  accepted_offers INT DEFAULT 0,
  completed_orders INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  response_time_hours DECIMAL(5,2) DEFAULT 0.00,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_approval_status (approval_status),
  INDEX idx_store_name (store_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Satıcı Profili Onay Geçmişi
CREATE TABLE IF NOT EXISTS seller_profile_approval_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_profile_id VARCHAR(36) NOT NULL,
  action ENUM('submitted', 'approved', 'rejected', 'resubmitted', 'suspended', 'unsuspended') NOT NULL,
  performed_by VARCHAR(36),
  reason TEXT,
  previous_data TEXT COMMENT 'JSON snapshot of previous state',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_seller_profile_id (seller_profile_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Satıcı Profili ile ilgili admin bildirimleri için mevcut admin_notifications tablosuna yeni tip ekle
-- (Bu sadece referans - tabloya ALTER yapılması gerekebilir)
-- ALTER TABLE admin_notifications MODIFY COLUMN type ENUM('new_listing','listing_resubmitted','new_offer','offer_resubmitted','seller_profile_pending','seller_profile_resubmitted','other') DEFAULT 'other';

-- Satıcı profili ID'sini admin_notifications'a ekle (eğer yoksa)
-- ALTER TABLE admin_notifications ADD COLUMN seller_profile_id VARCHAR(36) AFTER offer_id;
-- ALTER TABLE admin_notifications ADD FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id) ON DELETE CASCADE;

-- Users tablosuna satıcı profili referansı ekle (opsiyonel - hızlı erişim için)
ALTER TABLE users ADD COLUMN seller_profile_id VARCHAR(36) NULL AFTER role;
ALTER TABLE users ADD COLUMN is_verified_seller TINYINT(1) DEFAULT 0 AFTER seller_profile_id;
ALTER TABLE users ADD FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id) ON DELETE SET NULL;

-- İndeksler
CREATE INDEX idx_users_is_verified_seller ON users(is_verified_seller);

-- Satıcı Profili Değerlendirmeleri (İsteğe bağlı - gelecek için)
CREATE TABLE IF NOT EXISTS seller_reviews (
  id VARCHAR(36) PRIMARY KEY,
  seller_profile_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  response_text TEXT COMMENT 'Seller response to review',
  response_at TIMESTAMP NULL,
  is_visible TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_order_review (order_id),
  INDEX idx_seller_profile_id (seller_profile_id),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
