-- admin_notifications tablosuna seller_profile desteği ekle

USE varmi_db;

-- type enum'una yeni değerler ekle
ALTER TABLE admin_notifications 
MODIFY COLUMN type ENUM(
  'new_listing',
  'listing_resubmitted',
  'new_offer',
  'offer_resubmitted',
  'seller_profile_pending',
  'seller_profile_resubmitted',
  'other'
) DEFAULT 'other';

-- seller_profile_id kolonunu ekle
ALTER TABLE admin_notifications 
ADD COLUMN seller_profile_id VARCHAR(36) AFTER offer_id;

-- Foreign key ekle
ALTER TABLE admin_notifications 
ADD FOREIGN KEY (seller_profile_id) REFERENCES seller_profiles(id) ON DELETE CASCADE;
