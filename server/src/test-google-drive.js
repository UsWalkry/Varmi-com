import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// .env yolunu server'daki gibi ayarla
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');

console.log('🔍 Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('✅ Environment Variables Test:');
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'EXISTS' : 'NOT FOUND');
console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);
console.log('GOOGLE_PRIVATE_KEY length:', process.env.GOOGLE_PRIVATE_KEY?.length || 0);
console.log('GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID || 'NOT FOUND');

// Google Drive service test
import { google } from 'googleapis';

function getGoogleDriveConfig() {
  return {
    CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID,
  };
}

const config = getGoogleDriveConfig();
console.log('\n🚀 Google Drive Config Test:');
console.log('CLIENT_EMAIL:', config.CLIENT_EMAIL);
console.log('PRIVATE_KEY preview:', config.PRIVATE_KEY?.substring(0, 50) + '...');
console.log('FOLDER_ID:', config.FOLDER_ID);

try {
  const auth = new google.auth.JWT({
    email: config.CLIENT_EMAIL,
    key: config.PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  console.log('✅ JWT authentication created successfully!');
} catch (error) {
  console.log('❌ JWT authentication failed:', error.message);
}