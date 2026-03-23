-- Add seller profile notification types to admin_notifications
ALTER TABLE admin_notifications 
MODIFY COLUMN type ENUM(
  'new_listing',
  'listing_resubmitted',
  'new_offer',
  'offer_resubmitted',
  'seller_profile_pending',
  'seller_profile_resubmitted',
  'other'
) NOT NULL DEFAULT 'other';
