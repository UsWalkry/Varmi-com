import { query } from './src/database.js';

const sql = `CREATE TABLE IF NOT EXISTS user_ibans (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  iban VARCHAR(32) NOT NULL,
  account_holder_name VARCHAR(150) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_ibans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_ibans_user (user_id),
  UNIQUE KEY uq_user_iban (user_id, iban)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

try {
  await query(sql);
  console.log('✅ user_ibans tablosu oluşturuldu veya zaten mevcut');
} catch (e) {
  console.error('❌ Hata:', e.message);
}
process.exit(0);
