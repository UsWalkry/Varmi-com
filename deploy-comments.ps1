# Comments System - Production Deployment Script
# Bu script tüm deployment işlemlerini yapar

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🚀 Comments System Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration - Bu değerleri kendi bilgilerinizle güncelleyin
$SSH_HOST = "varmii.com"
$SSH_USER = "root"  # veya sizin kullanıcı adınız
$SSH_PORT = "22"
$REMOTE_DIR = "/var/www/varmii/backend"  # Backend'in yüklü olduğu dizin
$DB_NAME = "varmi_db"
$DB_USER = "root"  # veya database kullanıcınız

Write-Host "📍 Hedef Sunucu: $SSH_USER@$SSH_HOST" -ForegroundColor Yellow
Write-Host "📁 Backend Dizin: $REMOTE_DIR" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Deployment başlatılsın mı? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Deployment iptal edildi." -ForegroundColor Red
    exit
}

try {
    # Step 1: Backend Build
    Write-Host ""
    Write-Host "📦 Step 1: Backend build ediliyor..." -ForegroundColor Green
    Set-Location "server"
    
    Write-Host "   Cleaning old build..." -ForegroundColor Yellow
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    Write-Host "   Building..." -ForegroundColor Yellow
    npx tsc
    
    if (!(Test-Path "dist")) {
        throw "Build failed - dist folder not found"
    }
    Write-Host "   ✅ Build tamamlandı" -ForegroundColor Green
    
    # Step 2: Create deployment package
    Write-Host ""
    Write-Host "📦 Step 2: Deployment package hazırlanıyor..." -ForegroundColor Green
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $packageName = "comments-deployment-$timestamp.zip"
    
    # Compress files
    Compress-Archive -Path "dist/*" -DestinationPath "../$packageName" -Force
    
    Set-Location ".."
    Write-Host "   ✅ Package hazır: $packageName" -ForegroundColor Green
    
    # Step 3: Upload SQL file
    Write-Host ""
    Write-Host "📤 Step 3: SQL dosyası yükleniyor..." -ForegroundColor Green
    
    $sqlFile = "deploy-comments-production.sql"
    Write-Host "   Uploading $sqlFile..." -ForegroundColor Yellow
    
    # SCP komutu (Windows'ta OpenSSH yüklü olmalı)
    scp -P $SSH_PORT "$sqlFile" "${SSH_USER}@${SSH_HOST}:/tmp/$sqlFile"
    
    Write-Host "   ✅ SQL dosyası yüklendi" -ForegroundColor Green
    
    # Step 4: Execute SQL
    Write-Host ""
    Write-Host "🗄️  Step 4: Database güncelleniyor..." -ForegroundColor Green
    
    ssh -p $SSH_PORT "${SSH_USER}@${SSH_HOST}" @"
        mysql -u $DB_USER -p $DB_NAME < /tmp/$sqlFile
        echo '✅ Database güncellendi'
        rm /tmp/$sqlFile
"@
    
    Write-Host "   ✅ Database güncelleme tamamlandı" -ForegroundColor Green
    
    # Step 5: Upload backend files
    Write-Host ""
    Write-Host "📤 Step 5: Backend dosyaları yükleniyor..." -ForegroundColor Green
    
    # Upload package
    scp -P $SSH_PORT "$packageName" "${SSH_USER}@${SSH_HOST}:/tmp/"
    
    # Extract and update on server
    ssh -p $SSH_PORT "${SSH_USER}@${SSH_HOST}" @"
        cd $REMOTE_DIR
        echo 'Backing up current dist...'
        if [ -d dist_backup ]; then rm -rf dist_backup; fi
        if [ -d dist ]; then cp -r dist dist_backup; fi
        
        echo 'Extracting new files...'
        unzip -o /tmp/$packageName -d dist/
        
        echo 'Cleaning up...'
        rm /tmp/$packageName
        
        echo '✅ Backend dosyaları güncellendi'
"@
    
    Write-Host "   ✅ Backend dosyaları yüklendi" -ForegroundColor Green
    
    # Step 6: Restart backend
    Write-Host ""
    Write-Host "🔄 Step 6: Backend yeniden başlatılıyor..." -ForegroundColor Green
    
    ssh -p $SSH_PORT "${SSH_USER}@${SSH_HOST}" @"
        cd $REMOTE_DIR
        
        if command -v pm2 >/dev/null 2>&1; then
            echo 'Restarting with PM2...'
            pm2 restart all
            pm2 logs --lines 20
        else
            echo 'Restarting Node.js process...'
            pkill -f 'node dist/index.js' || true
            nohup node dist/index.js > logs/server.log 2>&1 & disown
        fi
        
        echo '✅ Backend yeniden başlatıldı'
"@
    
    Write-Host "   ✅ Backend restart edildi" -ForegroundColor Green
    
    # Step 7: Verify
    Write-Host ""
    Write-Host "✅ Step 7: Doğrulama yapılıyor..." -ForegroundColor Green
    
    Start-Sleep -Seconds 3
    
    Write-Host "   Testing endpoint..." -ForegroundColor Yellow
    $testUrl = "https://$SSH_HOST/api/comments/listing/test"
    try {
        $response = Invoke-WebRequest -Uri $testUrl -Method GET -UseBasicParsing
        Write-Host "   ✅ Endpoint çalışıyor (Status: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Endpoint henüz hazır değil (Normal olabilir, birkaç saniye bekleyin)" -ForegroundColor Yellow
    }
    
    # Cleanup local package
    Remove-Item $packageName -Force
    
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "✅ DEPLOYMENT TAMAMLANDI!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Test Adımları:" -ForegroundColor Yellow
    Write-Host "1. https://$SSH_HOST adresine gidin" -ForegroundColor White
    Write-Host "2. Bir ilana tıklayın" -ForegroundColor White
    Write-Host "3. 'Yorumlar ve Sorular' butonuna tıklayın" -ForegroundColor White
    Write-Host "4. Yorum yazın ve gönderin" -ForegroundColor White
    Write-Host ""
    Write-Host "🔍 Log kontrolü için:" -ForegroundColor Yellow
    Write-Host "ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST} 'cd $REMOTE_DIR && pm2 logs'" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ HATA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Hata ayıklama için:" -ForegroundColor Yellow
    Write-Host "ssh -p $SSH_PORT ${SSH_USER}@${SSH_HOST}" -ForegroundColor White
    exit 1
}
