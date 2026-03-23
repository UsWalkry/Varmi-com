-- Komisyon sistemi güncellemesi: Alışverişte kullanılan komisyon takibi
-- Bu script orders tablosuna commission_used kolonunu ekler

USE varmi_db;

-- Orders tablosuna commission_used kolonu ekle
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS commission_used DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Alışverişte kullanılan komisyon bakiyesi';

SELECT 'Orders tablosuna commission_used kolonu eklendi' AS status;
