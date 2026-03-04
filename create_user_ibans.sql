-- ============================================
-- user_ibans tablosu: Kullanıcı IBAN bilgileri
-- ============================================

CREATE TABLE IF NOT EXISTS user_ibans (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  title       VARCHAR(100) NOT NULL COMMENT 'Hesap takma adı (örn: Akbank Maaş)',
  bank_name   VARCHAR(100) NOT NULL COMMENT 'Banka adı',
  iban        VARCHAR(32)  NOT NULL COMMENT 'IBAN (TR + 24 rakam)',
  account_holder_name VARCHAR(150) NOT NULL COMMENT 'Hesap sahibi adı soyadı',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT 'Varsayılan IBAN',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_ibans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_ibans_user (user_id),
  UNIQUE KEY uq_user_iban (user_id, iban)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Örnek veri (test için, istenirse silin)
-- ============================================
-- INSERT INTO user_ibans (user_id, title, bank_name, iban, account_holder_name, is_default)
-- VALUES ('USER_UUID_HERE', 'Akbank', 'Akbank', 'TR320010009999901234567890', 'Ad Soyad', 1);
