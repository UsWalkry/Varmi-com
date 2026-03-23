-- Add birth_date column to users table
-- Safe to run multiple times (ignores duplicate column errors when applied via runner)

ALTER TABLE users 
ADD COLUMN birth_date DATE NULL AFTER gender;

-- Show the updated structure
DESCRIBE users;
