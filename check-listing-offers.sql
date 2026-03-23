-- Check offers for specific listing
SELECT 
  id,
  listing_id, 
  seller_id,
  seller_name,
  status,
  approval_status,
  created_at
FROM offers 
WHERE listing_id = 'b5ac26e1-5ea2-4e2e-a5bb-ac8bb0c498a0'
ORDER BY created_at DESC;

-- Check user's offers
SELECT 
  id,
  listing_id,
  status,
  approval_status,
  created_at
FROM offers 
WHERE listing_id = 'b5ac26e1-5ea2-4e2e-a5bb-ac8bb0c498a0' 
  AND seller_id = '1bc43548-ebae-4060-b4b5-43167937862a'
ORDER BY created_at DESC;
