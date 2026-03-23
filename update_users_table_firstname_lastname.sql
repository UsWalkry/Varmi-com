-- Update users table to use firstName and lastName instead of name
-- This script splits the existing name field and creates separate columns

-- First, add the new columns
ALTER TABLE users 
ADD COLUMN firstName VARCHAR(100) NULL AFTER email,
ADD COLUMN lastName VARCHAR(100) NULL AFTER firstName;

-- Migrate existing data from name to firstName/lastName
UPDATE users 
SET 
    firstName = TRIM(SUBSTRING_INDEX(name, ' ', 1)),
    lastName = TRIM(SUBSTRING_INDEX(name, ' ', -1))
WHERE name IS NOT NULL AND name != '';

-- For names with no space, put everything in firstName
UPDATE users 
SET lastName = NULL 
WHERE firstName = lastName AND firstName IS NOT NULL;

-- Drop the old name column
ALTER TABLE users DROP COLUMN name;

-- Show the updated structure
DESCRIBE users;