-- Add previous_status and new_status columns to listing_approval_audit table
-- for status change tracking

ALTER TABLE listing_approval_audit 
ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50) AFTER reason,
ADD COLUMN IF NOT EXISTS new_status VARCHAR(50) AFTER previous_status;

-- Verify the changes
SHOW COLUMNS FROM listing_approval_audit;
