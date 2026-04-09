-- Gender ENUM'a "prefer_not_to_say" (Belirtmek istemiyorum) seçeneği ekleme
-- Çalıştır: MySQL/MariaDB üzerinde

ALTER TABLE users 
  MODIFY COLUMN gender ENUM('male', 'female', 'other', 'prefer_not_to_say') 
  DEFAULT NULL 
  COMMENT 'male=Erkek, female=Kadın, other=Diğer, prefer_not_to_say=Belirtmek istemiyorum';

-- Değişikliği doğrula
SHOW COLUMNS FROM users WHERE Field = 'gender';
