import { query } from './src/database.js';

const listingId = 'b5ac26e1-5ea2-4e2e-a5bb-ac8bb0c498a0';
const userId = '1bc43548-ebae-4060-b4b5-43167937862a';

console.log('🔍 Checking offers for listing:', listingId);
console.log('🔍 User ID:', userId);

try {
  const offers = await query(
    `SELECT id, listing_id, seller_id, status, approval_status, created_at 
     FROM offers 
     WHERE listing_id = ?`,
    [listingId]
  );
  
  console.log('\n📊 All offers for this listing:', JSON.stringify(offers, null, 2));
  
  const userOffers = await query(
    `SELECT id, status, approval_status, created_at 
     FROM offers 
     WHERE listing_id = ? AND seller_id = ?`,
    [listingId, userId]
  );
  
  console.log('\n👤 User offers for this listing:', JSON.stringify(userOffers, null, 2));
  
  const activeUserOffers = await query(
    `SELECT id, status, approval_status, created_at 
     FROM offers 
     WHERE listing_id = ? AND seller_id = ? AND status != 'withdrawn'`,
    [listingId, userId]
  );
  
  console.log('\n✅ Active user offers (status != withdrawn):', JSON.stringify(activeUserOffers, null, 2));
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
