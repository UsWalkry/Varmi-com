-- Add is_featured column to listings table if it doesn't exist
ALTER TABLE listings ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0;

-- Verify the column was added
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='listings' AND COLUMN_NAME='is_featured';
