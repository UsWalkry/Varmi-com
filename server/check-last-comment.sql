-- Check the last inserted comment
SELECT 
    lc.id,
    lc.listing_id,
    lc.user_id,
    lc.comment,
    lc.is_visible,
    lc.is_owner_reply,
    lc.parent_comment_id,
    lc.created_at,
    u.firstName,
    u.lastName,
    u.email,
    l.buyer_id as listing_owner_id
FROM listing_comments lc
JOIN users u ON lc.user_id = u.id
JOIN listings l ON lc.listing_id = l.id
WHERE lc.id = '856f380b-8776-44e4-953e-03419d6b41e7';

-- Check if this user has any pending comments on this listing
SELECT 
    lc.*,
    u.email
FROM listing_comments lc
JOIN users u ON lc.user_id = u.id
WHERE lc.listing_id = 'b4494b18-8090-42fe-ac96-f80774e26fb7'
  AND lc.is_visible = FALSE
  AND lc.parent_comment_id IS NULL;
