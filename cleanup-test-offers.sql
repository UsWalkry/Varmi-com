-- Delete test offers for this listing
DELETE FROM offers 
WHERE listing_id = 'b5ac26e1-5ea2-4e2e-a5bb-ac8bb0c498a0';

-- Verify deletion
SELECT COUNT(*) as remaining_offers 
FROM offers 
WHERE listing_id = 'b5ac26e1-5ea2-4e2e-a5bb-ac8bb0c498a0';
