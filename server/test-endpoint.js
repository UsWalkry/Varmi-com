// Quick test of /api/listings/active endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8787,
  path: '/api/listings/active',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';

  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Response received');
    try {
      const parsed = JSON.parse(data);
      console.log(`\n📈 Response:`, JSON.stringify(parsed, null, 2).substring(0, 500));
      console.log(`\n✓ Total listings: ${parsed.listings ? parsed.listings.length : 0}`);
      process.exit(0);
    } catch (e) {
      console.log('\n❌ Failed to parse JSON');
      console.log('Raw data:', data.substring(0, 500));
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request error:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('\n❌ Request timeout');
  req.destroy();
  process.exit(1);
});

console.log('🔍 Testing GET /api/listings/active...');
req.end();
