# Comments System - Simple Production Deployment
$ErrorActionPreference = "Stop"

Write-Host "======================================"
Write-Host "Comments System Deployment"
Write-Host "======================================"
Write-Host ""

# ADIM 1: Backend Build
Write-Host "Step 1: Building backend..." -ForegroundColor Green
Set-Location "server"

if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

npx tsc

if (!(Test-Path "dist")) {
    throw "Build failed"
}

Write-Host "Backend build OK" -ForegroundColor Green

# ADIM 2: Deployment dosyalarını hazırla
Set-Location ".."

Write-Host ""
Write-Host "======================================"
Write-Host "MANUEL DEPLOYMENT ADIMLARI:"
Write-Host "======================================"
Write-Host ""
Write-Host "1. SQL DOSYASINI YUKLE VE CALISTIR:" -ForegroundColor Yellow
Write-Host "   Dosya: deploy-comments-production.sql"
Write-Host "   Komut: mysql -u root -p varmi_db < deploy-comments-production.sql"
Write-Host ""
Write-Host "2. BACKEND DOSYALARINI YUKLE:" -ForegroundColor Yellow
Write-Host "   server/dist/routes/comments.js -> production"
Write-Host "   server/dist/index.js -> production"  
Write-Host "   server/dist/services/emailService.js -> production"
Write-Host ""
Write-Host "3. BACKEND'I RESTART ET:" -ForegroundColor Yellow
Write-Host "   pm2 restart all"
Write-Host ""
Write-Host "======================================"
Write-Host ""

$answer = Read-Host "SSH ile otomatik deployment yapalim mi? (y/n)"

if ($answer -eq "y") {
    $SSH_HOST = Read-Host "SSH Host (ornek: varmii.com)"
    $SSH_USER = Read-Host "SSH User (ornek: root)"
    $REMOTE_DIR = Read-Host "Backend dizini (ornek: /var/www/varmii/backend)"
    
    Write-Host ""
    Write-Host "Uploading SQL..." -ForegroundColor Green
    scp deploy-comments-production.sql "${SSH_USER}@${SSH_HOST}:/tmp/"
    
    Write-Host "Executing SQL..." -ForegroundColor Green
    ssh "${SSH_USER}@${SSH_HOST}" "mysql -u root -p varmi_db < /tmp/deploy-comments-production.sql"
    
    Write-Host "Uploading backend files..." -ForegroundColor Green
    scp server/dist/routes/comments.js "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/dist/routes/"
    scp server/dist/index.js "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/dist/"
    scp server/dist/services/emailService.js "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/dist/services/"
    
    Write-Host "Restarting backend..." -ForegroundColor Green
    ssh "${SSH_USER}@${SSH_HOST}" "cd ${REMOTE_DIR} && pm2 restart all"
    
    Write-Host ""
    Write-Host "DEPLOYMENT TAMAMLANDI!" -ForegroundColor Green
} else {
    Write-Host "Manuel deployment icin dosyalar hazir." -ForegroundColor Yellow
}
