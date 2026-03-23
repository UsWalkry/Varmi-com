-- Admin Listing Approval System Kurulum Scripti
-- Bu script'i MySQL veritabanınızda çalıştırın

-- Önce veritabanına bağlanın
USE varmi_db;

-- Script'i çalıştır
SOURCE c:/Users/Burak AYDIN/Desktop/Varmi-com-sql/add_listing_approval_system.sql;

-- Sonuçları kontrol et
SELECT 'Approval system installed!' AS status;

-- Tablo yapılarını kontrol et
DESCRIBE listings;
DESCRIBE listing_approval_audit;
DESCRIBE admin_notifications;

-- Örnek veri kontrolü
SELECT 
    COUNT(*) as total_listings,
    SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) as rejected
FROM listings;
