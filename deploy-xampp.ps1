# XAMPP Local Deployment - Comments System
$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Comments System - XAMPP Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# XAMPP MySQL bilgileri
$MYSQL_PATH = "C:\xampp\mysql\bin\mysql.exe"
$DB_NAME = "varmi_db"
$DB_USER = "root"
$DB_PASS = ""  # XAMPP default password boş

Write-Host "Step 1: Backend build..." -ForegroundColor Green
Set-Location "server"

if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

Write-Host "Building TypeScript..." -ForegroundColor Yellow
npx tsc

if (!(Test-Path "dist")) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build OK!" -ForegroundColor Green

Set-Location ".."

# Step 2: SQL çalıştır
Write-Host ""
Write-Host "Step 2: Database guncelleniyor..." -ForegroundColor Green

if (Test-Path $MYSQL_PATH) {
    Write-Host "Running SQL..." -ForegroundColor Yellow
    
    $sqlContent = Get-Content "deploy-comments-production.sql" -Raw
    $sqlContent | & $MYSQL_PATH -u $DB_USER $DB_NAME
    
    Write-Host "Database guncellendi!" -ForegroundColor Green
} else {
    Write-Host "XAMPP MySQL bulunamadi: $MYSQL_PATH" -ForegroundColor Red
    Write-Host "Manuel calistirin: " -ForegroundColor Yellow
    Write-Host "phpMyAdmin'den deploy-comments-production.sql dosyasini import edin" -ForegroundColor Yellow
}

# Step 3: Dosyalar zaten local, sadece reload gerek
Write-Host ""
Write-Host "Step 3: Backend restart..." -ForegroundColor Green
Write-Host "XAMPP'de backend nasil calistiriliyorsa onu restart edin:" -ForegroundColor Yellow
Write-Host "- pnpm dev ile calistiriyorsaniz: Ctrl+C sonra tekrar 'pnpm dev'" -ForegroundColor White
Write-Host "- node ile calistiriyorsaniz: process'i durdurup tekrar baslatin" -ForegroundColor White

Write-Host ""
Write-Host "======================================"  -ForegroundColor Cyan
Write-Host "DEPLOYMENT TAMAMLANDI!" -ForegroundColor Green
Write-Host "======================================"  -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend'i restart ettikten sonra test edin:" -ForegroundColor Yellow
Write-Host "1. http://localhost:5173 adresine gidin" -ForegroundColor White
Write-Host "2. Bir ilana tiklayin" -ForegroundColor White  
Write-Host "3. 'Yorumlar ve Sorular' butonuna tiklayin" -ForegroundColor White
Write-Host "4. Yorum yazin ve gonderin" -ForegroundColor White
Write-Host ""
