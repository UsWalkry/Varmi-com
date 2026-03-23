const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('📋 .env file contents:');
console.log('Lines containing GOOGLE:');

const lines = envContent.split('\n');
lines.forEach((line, i) => {
  if (line.includes('GOOGLE')) {
    console.log(`Line ${i + 1}: ${line.substring(0, 100)}...`);
  }
});

// Test environment variable loading
console.log('\n🔍 Environment Variables:');
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL || 'NOT FOUND');
console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);
console.log('GOOGLE_PRIVATE_KEY length:', process.env.GOOGLE_PRIVATE_KEY?.length || 0);
console.log('GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT FOUND');