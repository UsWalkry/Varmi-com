# Admin Listing Approval System - Kurulum Scripti
# Bu script veritabanı şemasını günceller

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Admin Listing Approval System Kurulumu" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# .env dosyasından veritabanı bilgilerini oku
$envPath = "c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\.env"

if (!(Test-Path $envPath)) {
    Write-Host "ERROR: .env dosyasi bulunamadi!" -ForegroundColor Red
    Write-Host "Path: $envPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. .env dosyasi okunuyor..." -ForegroundColor Yellow
$envContent = Get-Content $envPath
$dbHost = ($envContent | Select-String "DB_HOST=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbUser = ($envContent | Select-String "DB_USER=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbPassword = ($envContent | Select-String "DB_PASSWORD=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbName = ($envContent | Select-String "DB_NAME=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })
$dbPort = ($envContent | Select-String "DB_PORT=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value })

if (!$dbPort) { $dbPort = "3306" }

Write-Host "   DB Host: $dbHost" -ForegroundColor Gray
Write-Host "   DB User: $dbUser" -ForegroundColor Gray
Write-Host "   DB Name: $dbName" -ForegroundColor Gray
Write-Host "   DB Port: $dbPort" -ForegroundColor Gray
Write-Host ""

# SQL dosyasını çalıştır
$sqlFile = "c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\add_listing_approval_system.sql"

if (!(Test-Path $sqlFile)) {
    Write-Host "ERROR: SQL dosyasi bulunamadi!" -ForegroundColor Red
    Write-Host "Path: $sqlFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "2. SQL schema guncelleniyor..." -ForegroundColor Yellow

# MySQL komutunu oluştur
$mysqlCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword $dbName < `"$sqlFile`""

Write-Host "   Komut: mysql -h $dbHost -P $dbPort -u $dbUser -p*** $dbName" -ForegroundColor Gray
Write-Host ""

try {
    # MySQL komutunu çalıştır
    $result = cmd /c $mysqlCmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Schema basariyla guncellendi!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Schema guncellenirken hata olustu!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "ERROR: MySQL komutu calistirilamadi!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Kurulum Tamamlandi!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Yeni Ozellikler:" -ForegroundColor Yellow
Write-Host "  - listings tablosuna approval_status eklendi" -ForegroundColor Gray
Write-Host "  - listing_approval_audit tablosu olusturuldu" -ForegroundColor Gray
Write-Host "  - admin_notifications tablosu olusturuldu" -ForegroundColor Gray
Write-Host "  - pending_listings_view olusturuldu" -ForegroundColor Gray
Write-Host ""
Write-Host "Sonraki Adimlar:" -ForegroundColor Yellow
Write-Host "  1. Backend'i yeniden baslatın: cd server && pnpm dev" -ForegroundColor Gray
Write-Host "  2. Frontend'i yeniden baslatın: cd shadcn-ui && pnpm dev" -ForegroundColor Gray
Write-Host "  3. Admin panelinde 'Onay Bekleyen Ilanlar' bolumunu gorebilirsiniz" -ForegroundColor Gray
Write-Host ""
