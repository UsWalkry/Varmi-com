import { query } from './src/database.js';

async function checkTables() {
  try {
    console.log('🔍 Checking offers table...');
    const offers = await query('SELECT COUNT(*) as count FROM offers');
    console.log('Offers count:', offers[0]);

    console.log('🔍 Checking orders table...');
    const orders = await query('SELECT COUNT(*) as count FROM orders');
    console.log('Orders count:', orders[0]);

    console.log('🔍 Checking sample offers...');
    const sampleOffers = await query('SELECT id, status, created_at FROM offers LIMIT 5');
    console.log('Sample offers:', sampleOffers);

    console.log('🔍 Checking sample orders...');
    const sampleOrders = await query('SELECT id, status, total_amount FROM orders LIMIT 5');
    console.log('Sample orders:', sampleOrders);

    console.log('🔍 Checking listings offer_count...');
    const listingsOffers = await query('SELECT id, title, offer_count FROM listings WHERE offer_count > 0 LIMIT 5');
    console.log('Listings with offers:', listingsOffers);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();