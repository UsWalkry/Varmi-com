#!/usr/bin/env node
/**
 * 🔍 KAYNAK KOD GÜVENLİK TEST
 * Production build'de kaynak kod sızıntısı var mı kontrol eder
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 KAYNAK KOD GÜVENLİK TESTİ\n');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

// Test 1: Frontend Source Maps
console.log('\n1️⃣  Frontend Source Maps Kontrolü...');
const frontendDist = path.join(__dirname, 'shadcn-ui', 'dist');

if (fs.existsSync(frontendDist)) {
  const findMaps = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let maps = [];
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        maps = maps.concat(findMaps(fullPath));
      } else if (file.name.endsWith('.map')) {
        maps.push(fullPath);
      }
    });
    
    return maps;
  };
  
  const mapFiles = findMaps(frontendDist);
  
  if (mapFiles.length > 0) {
    console.log('   🔴 FAILED: Source maps bulundu!');
    mapFiles.slice(0, 5).forEach(f => console.log('      -', path.basename(f)));
    failed++;
  } else {
    console.log('   ✅ PASSED: Source maps yok');
    passed++;
  }
} else {
  console.log('   ⚠️  SKIP: dist/ klasörü yok (build yapılmamış)');
}

// Test 2: Backend Source Maps
console.log('\n2️⃣  Backend Source Maps Kontrolü...');
const backendDist = path.join(__dirname, 'server', 'dist');

if (fs.existsSync(backendDist)) {
  const files = fs.readdirSync(backendDist);
  const mapFiles = files.filter(f => f.endsWith('.map'));
  
  if (mapFiles.length > 0) {
    console.log('   🔴 FAILED: Backend source maps bulundu!');
    mapFiles.slice(0, 5).forEach(f => console.log('      -', f));
    failed++;
  } else {
    console.log('   ✅ PASSED: Backend source maps yok');
    passed++;
  }
} else {
  console.log('   ⚠️  SKIP: server/dist/ klasörü yok');
}

// Test 3: Vite Config Kontrolü
console.log('\n3️⃣  Vite Config Güvenlik Ayarları...');
const viteConfig = path.join(__dirname, 'shadcn-ui', 'vite.config.ts');

if (fs.existsSync(viteConfig)) {
  const content = fs.readFileSync(viteConfig, 'utf-8');
  
  const checks = {
    'sourcemap: false': content.includes('sourcemap: false'),
    'drop_console': content.includes('drop_console'),
    'minify': content.includes("minify: 'terser'"),
    'Sentry dev-only': content.includes('!isProduction'),
  };
  
  const allPassed = Object.values(checks).every(Boolean);
  
  if (allPassed) {
    console.log('   ✅ PASSED: Güvenlik ayarları doğru');
    passed++;
  } else {
    console.log('   🔴 FAILED: Eksik güvenlik ayarları:');
    Object.entries(checks).forEach(([name, pass]) => {
      console.log(`      ${pass ? '✅' : '❌'} ${name}`);
    });
    failed++;
  }
} else {
  console.log('   ⚠️  SKIP: vite.config.ts bulunamadı');
}

// Test 4: tsconfig.json Kontrolü
console.log('\n4️⃣  Backend tsconfig.json Kontrolü...');
const tsconfig = path.join(__dirname, 'server', 'tsconfig.json');

if (fs.existsSync(tsconfig)) {
  const content = fs.readFileSync(tsconfig, 'utf-8');
  
  const checks = {
    'sourceMap: false': content.includes('"sourceMap": false'),
    'removeComments: true': content.includes('"removeComments": true'),
  };
  
  const allPassed = Object.values(checks).every(Boolean);
  
  if (allPassed) {
    console.log('   ✅ PASSED: tsconfig güvenli');
    passed++;
  } else {
    console.log('   🔴 FAILED: Eksik ayarlar:');
    Object.entries(checks).forEach(([name, pass]) => {
      console.log(`      ${pass ? '✅' : '❌'} ${name}`);
    });
    failed++;
  }
} else {
  console.log('   ⚠️  SKIP: tsconfig.json bulunamadı');
}

// Test 5: robots.txt Kontrolü
console.log('\n5️⃣  robots.txt Güvenlik Kontrolü...');
const robots = path.join(__dirname, 'shadcn-ui', 'public', 'robots.txt');

if (fs.existsSync(robots)) {
  const content = fs.readFileSync(robots, 'utf-8');
  
  const checks = {
    'Disallow /api/': content.includes('Disallow: /api/'),
    'Disallow /*.map': content.includes('Disallow: /*.map'),
  };
  
  const allPassed = Object.values(checks).every(Boolean);
  
  if (allPassed) {
    console.log('   ✅ PASSED: robots.txt doğru yapılandırılmış');
    passed++;
  } else {
    console.log('   ⚠️  WARNING: Eksik kurallar');
    failed++;
  }
} else {
  console.log('   ⚠️  SKIP: robots.txt bulunamadı');
}

// Test 6: .env Kontrolü
console.log('\n6️⃣  .env Dosyası Güvenlik Kontrolü...');
const envFile = path.join(__dirname, 'server', '.env');

if (fs.existsSync(envFile)) {
  // .gitignore kontrolü
  const gitignore = path.join(__dirname, '.gitignore');
  
  if (fs.existsSync(gitignore)) {
    const content = fs.readFileSync(gitignore, 'utf-8');
    
    if (content.includes('.env')) {
      console.log('   ✅ PASSED: .env gitignore\'da');
      passed++;
    } else {
      console.log('   🔴 FAILED: .env gitignore\'da değil!');
      failed++;
    }
  } else {
    console.log('   ⚠️  WARNING: .gitignore bulunamadı');
  }
} else {
  console.log('   ⚠️  SKIP: .env bulunamadı');
}

// Sonuç
console.log('\n' + '═'.repeat(60));
console.log('\n📊 TEST SONUÇLARI:');
console.log(`   ✅ Başarılı: ${passed}`);
console.log(`   ❌ Başarısız: ${failed}`);

const total = passed + failed;
const score = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log(`\n🎯 SKOR: ${score}%`);

if (score === 100) {
  console.log('   🟢 MÜKEMMEL - Kaynak kod güvenliği tam!');
} else if (score >= 80) {
  console.log('   🟡 İYİ - Bazı iyileştirmeler yapılabilir');
} else {
  console.log('   🔴 ZAYIF - Acil düzeltme gerekli!');
}

console.log('\n' + '═'.repeat(60) + '\n');

// Production build önerisi
if (score < 100) {
  console.log('💡 ÖNERI:');
  console.log('   1. cd shadcn-ui && pnpm build');
  console.log('   2. cd server && pnpm build');
  console.log('   3. node test-source-code-security.js (tekrar test)\n');
}

process.exit(failed > 0 ? 1 : 0);
