# XAMPP MySQL Veritabani Yenileme
Write-Host "XAMPP MySQL veritabani yenileniyor..." -ForegroundColor Cyan

# MySQL'in calistigini kontrol et
$mysqlProcess = Get-Process mysqld -ErrorAction SilentlyContinue
if (-not $mysqlProcess) {
    Write-Host "HATA: MySQL calismiyor!" -ForegroundColor Red
    Write-Host "Lutfen XAMPP Control Panel'den MySQL'i baslatin." -ForegroundColor Yellow
    exit 1
}

Write-Host "MySQL calisiyor (PID: $($mysqlProcess.Id))" -ForegroundColor Green

# Veritabanini yeniden olustur
Write-Host "`nVeritabani yeniden olusturuluyor..." -ForegroundColor Yellow

$mysql = "C:\xampp\mysql\bin\mysql.exe"
$commands = @"
DROP DATABASE IF EXISTS varmi_db;
CREATE DATABASE varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE varmi_db;
SHOW DATABASES;
"@

Write-Host "Veritabani siliniyor ve yeniden olusturuluyor..." -ForegroundColor Yellow
$commands | & $mysql -u root 2>&1

Write-Host "`nVeritabani hazir! Simdi tablolari olusturun:" -ForegroundColor Green
Write-Host "  cd server" -ForegroundColor White
Write-Host "  node create-missing-tables.js" -ForegroundColor White
