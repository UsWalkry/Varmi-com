-- Add FCM (Firebase Cloud Messaging) push token column to users table.
-- Run this once on the production database before deploying the FCM-enabled
-- server and Flutter builds.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(512) NULL DEFAULT NULL
    COMMENT 'Firebase Cloud Messaging device token for push notifications';

-- Optional: index helps if you later want to query by token (e.g. cleanup)
-- CREATE INDEX idx_users_fcm_token ON users (fcm_token(64));
