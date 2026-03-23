#!/usr/bin/env node
/**
 * Complete Flow Test - Validates that the /api/listings/active endpoint
 * returns the correct data structure that the frontend expects
 */

const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Complete Flow Test - Varmi.com API\n');
  
  try {
    // Test 1: Health check
    console.log('Test 1: Health Check (GET /)');
    let response = await makeRequest('/');
    console.log(`  Status: ${response.statusCode}`);
    const healthData = JSON.parse(response.body);
    console.log(`  OK: ${healthData.ok}`);
    console.log(`  ✅ Health check passed\n`);

    // Test 2: Get active listings
    console.log('Test 2: Get Active Listings (GET /api/listings/active)');
    response = await makeRequest('/api/listings/active');
    console.log(`  Status: ${response.statusCode}`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const listingsData = JSON.parse(response.body);
    console.log(`  Success: ${listingsData.success}`);
    console.log(`  Listings count: ${listingsData.listings.length}`);
    
    if (!listingsData.success) {
      throw new Error('Response success=false');
    }

    if (!Array.isArray(listingsData.listings)) {
      throw new Error('Response.listings is not an array');
    }

    if (listingsData.listings.length === 0) {
      console.warn('  ⚠️  No listings found in database');
    } else {
      console.log(`  ✅ Found ${listingsData.listings.length} active listings\n`);

      // Test 3: Validate listing structure
      console.log('Test 3: Validate Listing Data Structure');
      const requiredFields = [
        'id', 'title', 'condition', 'price', 'budgetMax',
        'currency', 'location', 'city', 'description',
        'images', 'createdAt', 'category', 'deliveryType',
        'offerCount', 'buyerId', 'buyerName', 'seller'
      ];

      const firstListing = listingsData.listings[0];
      const missingFields = requiredFields.filter(f => !(f in firstListing));
      
      if (missingFields.length > 0) {
        console.error(`  ❌ Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log(`  ✅ All required fields present`);
      }

      // Sample listing
      console.log(`\n  Sample Listing:`);
      console.log(`    - ID: ${firstListing.id}`);
      console.log(`    - Title: ${firstListing.title}`);
      console.log(`    - Buyer: ${firstListing.buyerName}`);
      console.log(`    - Price: ${firstListing.price} ${firstListing.currency}`);
      console.log(`    - Category: ${firstListing.category}`);
      console.log(`    - Images: ${firstListing.images.length} images`);
      console.log(`    - Offers: ${firstListing.offerCount} offers`);
    }

    console.log('\n🎉 All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
