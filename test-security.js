#!/usr/bin/env node
/**
 * 🛡️ SECURITY TEST SUITE
 * Yeni güvenlik önlemlerini test eder
 * 
 * Kullanım:
 *   node test-security.js
 */

const API_BASE = 'http://localhost:8787/api';

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const log = {
  success: (msg) => console.log(`${GREEN}✅ ${msg}${RESET}`),
  error: (msg) => console.log(`${RED}❌ ${msg}${RESET}`),
  warning: (msg) => console.log(`${YELLOW}⚠️  ${msg}${RESET}`),
  info: (msg) => console.log(`${BLUE}ℹ️  ${msg}${RESET}`),
  section: (msg) => console.log(`\n${BLUE}${'='.repeat(50)}${RESET}\n${msg}\n${BLUE}${'='.repeat(50)}${RESET}\n`),
};

async function testRateLimit() {
  log.section('TEST 1: Rate Limiting (Brute-Force Koruması)');
  
  try {
    // 6 kez yanlış login dene (limit 5)
    for (let i = 1; i <= 6; i++) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'wrongpassword'
        })
      });
      
      if (i <= 5) {
        log.info(`Deneme ${i}/6: ${response.status}`);
      } else {
        if (response.status === 429) {
          log.success('Rate limit çalışıyor! 6. istek engellendi (429 Too Many Requests)');
        } else {
          log.error(`Rate limit ÇALIŞMIYOR! 6. istek ${response.status} döndü`);
        }
      }
      
      // 200ms bekle
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (error) {
    log.error(`Test hatası: ${error.message}`);
  }
}

async function testInputValidation() {
  log.section('TEST 2: Input Validation');
  
  // Test 1: Geçersiz email
  try {
    const res1 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',  // Geçersiz
        password: 'Test1234',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    const data1 = await res1.json();
    
    if (res1.status === 400 && data1.error) {
      log.success('Email validation çalışıyor: ' + data1.error);
    } else {
      log.error('Email validation ÇALIŞMIYOR!');
    }
  } catch (error) {
    log.error(`Email validation test hatası: ${error.message}`);
  }
  
  // Test 2: Zayıf şifre
  try {
    const res2 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'weak',  // Çok kısa
        firstName: 'Test',
        lastName: 'User'
      })
    });
    const data2 = await res2.json();
    
    if (res2.status === 400 && data2.error) {
      log.success('Password policy çalışıyor: ' + data2.error);
    } else {
      log.error('Password policy ÇALIŞMIYOR!');
    }
  } catch (error) {
    log.error(`Password policy test hatası: ${error.message}`);
  }
}

async function testCORS() {
  log.section('TEST 3: CORS Security');
  
  try {
    // Geçersiz origin ile istek
    const response = await fetch(`${API_BASE}/listings/active`, {
      method: 'GET',
      headers: {
        'Origin': 'https://evil-site.com'  // Whitelist'te yok
      }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    
    if (!corsHeader || corsHeader === 'https://evil-site.com') {
      log.error('CORS çalışmıyor! Evil origin kabul edildi');
    } else {
      log.success('CORS çalışıyor! Sadece whitelist domainler kabul ediliyor');
    }
  } catch (error) {
    log.warning(`CORS test edilemedi (normal olabilir): ${error.message}`);
  }
}

async function testFileUpload() {
  log.section('TEST 4: File Upload Security');
  
  log.warning('File upload testi manuel yapılmalıdır:');
  console.log('1. /api/listings/upload endpoint\'ine .exe dosyası yükleyin');
  console.log('2. Sistem "Sadece resim dosyaları" hatası vermeli');
  console.log('3. 6MB\'tan büyük dosya yükleyin -> "File too large" hatası vermeli');
}

async function testSecurityHeaders() {
  log.section('TEST 5: Security Headers (Helmet.js)');
  
  try {
    const response = await fetch(`${API_BASE}/listings/active`);
    
    const headers = {
      'X-Content-Type-Options': response.headers.get('x-content-type-options'),
      'X-Frame-Options': response.headers.get('x-frame-options'),
      'X-XSS-Protection': response.headers.get('x-xss-protection'),
    };
    
    if (headers['X-Content-Type-Options'] === 'nosniff') {
      log.success('X-Content-Type-Options header mevcut');
    } else {
      log.error('X-Content-Type-Options header eksik');
    }
    
    if (headers['X-Frame-Options']) {
      log.success(`X-Frame-Options header mevcut: ${headers['X-Frame-Options']}`);
    } else {
      log.warning('X-Frame-Options header eksik');
    }
  } catch (error) {
    log.error(`Security headers test hatası: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🛡️  VARMİ.COM - GÜVENLİK TEST SUITE\n');
  console.log('Server URL:', API_BASE);
  console.log('Başlangıç zamanı:', new Date().toLocaleString('tr-TR'), '\n');
  
  await testRateLimit();
  await new Promise(r => setTimeout(r, 1000));
  
  await testInputValidation();
  await new Promise(r => setTimeout(r, 1000));
  
  await testCORS();
  await new Promise(r => setTimeout(r, 1000));
  
  testFileUpload();
  await new Promise(r => setTimeout(r, 1000));
  
  await testSecurityHeaders();
  
  log.section('TEST SONUÇLARI');
  console.log('Tüm testler tamamlandı!');
  console.log('\nNot: Rate limit 15 dakika sonra sıfırlanır.');
  console.log('Tekrar test için server\'ı restart edin: pm2 restart varmi-backend\n');
}

// Run tests
runAllTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
