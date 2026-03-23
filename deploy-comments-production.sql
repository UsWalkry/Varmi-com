-- Listing Comments System - Production Deployment
-- Run this on production database

-- Create listing_comments table
CREATE TABLE IF NOT EXISTS listing_comments (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  comment TEXT NOT NULL,
  parent_comment_id VARCHAR(36) DEFAULT NULL,
  is_owner_reply BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES listing_comments(id) ON DELETE CASCADE,
  INDEX idx_listing_comments_listing (listing_id),
  INDEX idx_listing_comments_user (user_id),
  INDEX idx_listing_comments_parent (parent_comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Verify table was created
SELECT 
  TABLE_NAME,
  ENGINE,
  TABLE_COLLATION,
  CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'listing_comments';

-- Show table structure
DESCRIBE listing_comments;

-- Show indexes
SHOW INDEX FROM listing_comments;
