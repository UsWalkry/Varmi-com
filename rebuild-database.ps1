# Veritabani Yeniden Olusturma Scripti
Write-Host "Veritabani yeniden olusturuluyor..." -ForegroundColor Cyan

# MySQL'i durdur
Write-Host "`n1. MySQL durduruluyor..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Eski varmi_db klasorunu sil
Write-Host "`n2. Eski veritabani dosyalari siliniyor..." -ForegroundColor Yellow
$dbPath = "C:\xampp\mysql\data\varmi_db"
if (Test-Path $dbPath) {
    Remove-Item $dbPath -Recurse -Force
    Write-Host "   Silindi: $dbPath" -ForegroundColor Green
}

# MySQL'i baslat
Write-Host "`n3. MySQL baslatiliyor..." -ForegroundColor Yellow
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini" -WindowStyle Hidden
Start-Sleep -Seconds 10

# MySQL'in basladigini kontrol et
$process = Get-Process mysqld -ErrorAction SilentlyContinue
if (-not $process) {
    Write-Host "   HATA: MySQL baslatilamadi!" -ForegroundColor Red
    Write-Host "   Lutfen XAMPP Control Panel'den manuel olarak baslatip enter'a basin..." -ForegroundColor Yellow
    Read-Host
}

# Yeni veritabani olustur
Write-Host "`n4. Yeni veritabani olusturuluyor..." -ForegroundColor Yellow
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "DROP DATABASE IF EXISTS varmi_db; CREATE DATABASE varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Write-Host "   Veritabani olusturuldu" -ForegroundColor Green

Write-Host "`n5. Tablolar olusturuluyor..." -ForegroundColor Yellow
Write-Host "   Node.js ile tablo olusturma scriptini calistirmak icin:" -ForegroundColor Cyan
Write-Host "   cd server" -ForegroundColor White
Write-Host "   node create-missing-tables.js" -ForegroundColor White

Write-Host "`nTamamlandi!" -ForegroundColor Green
