-- Dolap-style comment visibility system
-- Add visibility_state and isFirstSellerReplyExists to listing_comments

-- Step 1: Add new columns
ALTER TABLE listing_comments 
ADD COLUMN visibility_state ENUM('PRIVATE_UNTIL_SELLER_REPLY', 'PUBLIC_AFTER_SELLER_REPLY') 
DEFAULT 'PRIVATE_UNTIL_SELLER_REPLY' 
AFTER is_visible;

ALTER TABLE listing_comments 
ADD COLUMN is_first_seller_reply_exists BOOLEAN 
DEFAULT FALSE 
AFTER visibility_state;

-- Step 2: Update existing data
-- All existing VISIBLE comments should be PUBLIC
UPDATE listing_comments 
SET visibility_state = 'PUBLIC_AFTER_SELLER_REPLY',
    is_first_seller_reply_exists = TRUE
WHERE is_visible = TRUE;

-- Step 3: Add index for performance
CREATE INDEX idx_listing_comments_visibility ON listing_comments(visibility_state, listing_id);
CREATE INDEX idx_listing_comments_listing_owner ON listing_comments(listing_id, user_id);

-- Step 4: Add comment for documentation
ALTER TABLE listing_comments 
COMMENT = 'Comments with Dolap-style visibility: PRIVATE until seller replies, then PUBLIC';

-- Verification query
SELECT 
    COUNT(*) as total_comments,
    SUM(CASE WHEN visibility_state = 'PRIVATE_UNTIL_SELLER_REPLY' THEN 1 ELSE 0 END) as private_comments,
    SUM(CASE WHEN visibility_state = 'PUBLIC_AFTER_SELLER_REPLY' THEN 1 ELSE 0 END) as public_comments,
    SUM(CASE WHEN is_first_seller_reply_exists = TRUE THEN 1 ELSE 0 END) as seller_replied
FROM listing_comments;
