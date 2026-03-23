#!/usr/bin/env node
/**
 * 🔍 GIT HISTORY .ENV CHECK
 * .env dosyalarının git history'de olup olmadığını kontrol eder
 */

const { execSync } = require('child_process');

console.log('\n🔍 GIT HISTORY .ENV KONTROL\n');
console.log('═'.repeat(60));

try {
  // Git repo kontrolü
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch (e) {
    console.log('⚠️  Bu klasör bir git repository değil');
    process.exit(0);
  }

  console.log('\n1️⃣  .env dosyalarını git history\'de arıyorum...\n');

  // .env dosyalarını history'de ara
  try {
    const output = execSync('git log --all --full-history --pretty=format:"%H %s" -- "**/.env" "**/.env.*" "**/server/.env"', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    if (output.trim()) {
      console.log('🔴 TEHLİKE! .env dosyaları git history\'de bulundu:\n');
      console.log(output);
      console.log('\n⚠️  ÇÖZÜM: Git history\'yi temizlemek için:');
      console.log('   git filter-branch --force --index-filter \\');
      console.log('     "git rm --cached --ignore-unmatch **/.env" \\');
      console.log('     --prune-empty --tag-name-filter cat -- --all');
      console.log('\n   Veya daha kolay: BFG Repo Cleaner kullanın');
      console.log('   https://rtyley.github.io/bfg-repo-cleaner/\n');
    } else {
      console.log('✅ .env dosyaları git history\'de bulunamadı (güvenli)');
    }
  } catch (e) {
    console.log('✅ .env dosyaları git history\'de bulunamadı (güvenli)');
  }

  console.log('\n2️⃣  .gitignore kontrolü...\n');

  // .gitignore var mı?
  try {
    const gitignore = execSync('cat .gitignore', { encoding: 'utf-8' });
    
    if (gitignore.includes('.env')) {
      console.log('✅ .gitignore\'da .env bulundu');
    } else {
      console.log('🔴 .gitignore\'da .env YOK! Hemen ekleyin:');
      console.log('   echo ".env" >> .gitignore');
      console.log('   echo ".env.*" >> .gitignore');
      console.log('   echo "!.env.example" >> .gitignore');
    }
  } catch (e) {
    console.log('⚠️  .gitignore dosyası bulunamadı');
  }

  console.log('\n3️⃣  Şu an stage\'de veya commit\'te olmayan .env var mı?\n');

  // Current status
  try {
    const status = execSync('git status --short', { encoding: 'utf-8' });
    const envFiles = status.split('\n').filter(line => line.includes('.env'));
    
    if (envFiles.length > 0) {
      console.log('⚠️  Şu anda tracked .env dosyaları var:\n');
      envFiles.forEach(file => console.log('   ' + file));
      console.log('\n   Bunları kaldırmak için:');
      console.log('   git rm --cached server/.env');
      console.log('   git commit -m "Remove .env from git"');
    } else {
      console.log('✅ Şu anda tracked .env dosyası yok');
    }
  } catch (e) {
    console.log('✅ Git working directory temiz');
  }

} catch (error) {
  console.error('\n❌ Hata:', error.message);
}

console.log('\n' + '═'.repeat(60) + '\n');
