-- Add seller profile columns to users table
ALTER TABLE users 
ADD COLUMN is_verified_seller BOOLEAN DEFAULT FALSE AFTER role,
ADD COLUMN seller_profile_id CHAR(36) DEFAULT NULL AFTER is_verified_seller;
