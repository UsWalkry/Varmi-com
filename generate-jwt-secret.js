#!/usr/bin/env node
/**
 * JWT Secret Key Generator
 * Generates a cryptographically secure 256-bit key for JWT_SECRET
 */

const crypto = require('crypto');

console.log('\n🔐 JWT SECRET KEY GENERATOR\n');
console.log('═'.repeat(60));
console.log('\n✅ Yeni güçlü JWT_SECRET (256-bit random):');
console.log('\nJWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('\n' + '═'.repeat(60));
console.log('\n⚠️  Bu key\'i server/.env dosyasına kopyalayın!');
console.log('⚠️  Production\'da mutlaka bu key\'i kullanın!\n');
