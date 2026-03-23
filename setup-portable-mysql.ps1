# MySQL Portable Kurulum (Manuel)
# ZIP dosyasini onceden indirip proje klasorune koymaniz gerekiyor

param(
    [string]$zipFile = ""
)

$projectRoot = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
$mysqlDir = Join-Path $projectRoot "mysql-portable"
$dataDir = Join-Path $mysqlDir "data"
$binDir = Join-Path $mysqlDir "bin"

Write-Host "Portable MySQL Kurulum" -ForegroundColor Cyan
Write-Host "=====================`n" -ForegroundColor Cyan

# ZIP dosyasini bul
if ($zipFile -eq "") {
    $zipFiles = Get-ChildItem $projectRoot -Filter "mysql-*.zip" | Select-Object -First 1
    if ($zipFiles) {
        $zipFile = $zipFiles.FullName
        Write-Host "ZIP dosyasi bulundu: $($zipFiles.Name)" -ForegroundColor Green
    } else {
        Write-Host "HATA: MySQL ZIP dosyasi bulunamadi!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Lutfen asagidaki adres MySQL indirin:" -ForegroundColor Yellow
        Write-Host "https://dev.mysql.com/downloads/mysql/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Windows (x86, 64-bit), ZIP Archive secin" -ForegroundColor Yellow
        Write-Host "Indirilen dosyayi bu klasore koyun: $projectRoot" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Sonra scripti tekrar calistirin:" -ForegroundColor Yellow
        Write-Host ".\setup-portable-mysql.ps1" -ForegroundColor White
        exit 1
    }
}

Write-Host "`n1. Eski kurulum temizleniyor..." -ForegroundColor Yellow
if (Test-Path $mysqlDir) {
    Remove-Item $mysqlDir -Recurse -Force
    Write-Host "   Temizlendi" -ForegroundColor Green
}

Write-Host "`n2. MySQL cikarilyor..." -ForegroundColor Yellow
Expand-Archive -Path $zipFile -DestinationPath $projectRoot -Force

# Klasor adini duzelt
$extractedFolder = Get-ChildItem $projectRoot -Filter "mysql-*" -Directory | Where-Object { $_.Name -ne "mysql-portable" } | Select-Object -First 1
if ($extractedFolder) {
    Rename-Item $extractedFolder.FullName $mysqlDir -Force
    Write-Host "   Cikarildi: $mysqlDir" -ForegroundColor Green
} else {
    Write-Host "   HATA: Klasor bulunamadi" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Yapilandiriliyor..." -ForegroundColor Yellow

# tmp klasoru
$tmpDir = Join-Path $mysqlDir "tmp"
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

# my.ini olustur
$myIniPath = Join-Path $mysqlDir "my.ini"
$myIniContent = @"
[mysqld]
port=3306
basedir=$($mysqlDir -replace '\\', '/')
datadir=$($dataDir -replace '\\', '/')
tmpdir=$($tmpDir -replace '\\', '/')

character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
default-storage-engine=INNODB

bind-address=127.0.0.1
max_connections=100
max_allowed_packet=16M

innodb_buffer_pool_size=256M
innodb_log_file_size=64M

[client]
port=3306
default-character-set=utf8mb4

[mysql]
default-character-set=utf8mb4
"@

Set-Content -Path $myIniPath -Value $myIniContent -Encoding UTF8

Write-Host "`n4. MySQL initialize ediliyor (birkaç dakika surebilir)..." -ForegroundColor Yellow
& "$binDir\mysqld.exe" --defaults-file="$myIniPath" --initialize-insecure --console 2>&1 | Out-String | Write-Host

if (-not (Test-Path $dataDir)) {
    Write-Host "   HATA: Data klasoru olusturulamadi!" -ForegroundColor Red
    exit 1
}

Write-Host "`n5. Yardimci scriptler olusturuluyor..." -ForegroundColor Yellow

# Start script
$startScript = @"
`$mysqlDir = Join-Path `$PSScriptRoot "mysql-portable"
`$myIniPath = Join-Path `$mysqlDir "my.ini"
`$binDir = Join-Path `$mysqlDir "bin"

Write-Host "MySQL baslatiliyor..." -ForegroundColor Green

# Onceki process'i temizle
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Baslat
Start-Process -FilePath "`$binDir\mysqld.exe" -ArgumentList "--defaults-file=`$myIniPath" -WindowStyle Hidden
Start-Sleep -Seconds 5

if (Get-Process mysqld -ErrorAction SilentlyContinue) {
    Write-Host "MySQL baslatildi!" -ForegroundColor Green
    Write-Host "Baglanti: 127.0.0.1:3306" -ForegroundColor Cyan
    Write-Host "Kullanici: root (sifresiz)" -ForegroundColor Cyan
} else {
    Write-Host "MySQL baslatilamadi!" -ForegroundColor Red
    Write-Host "Log: `$mysqlDir\data\*.err" -ForegroundColor Yellow
}
"@

Set-Content -Path (Join-Path $projectRoot "start-mysql.ps1") -Value $startScript

# Stop script
$stopScript = @"
Write-Host "MySQL durduruluyor..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "MySQL durduruldu." -ForegroundColor Green
"@

Set-Content -Path (Join-Path $projectRoot "stop-mysql.ps1") -Value $stopScript

Write-Host "`n6. MySQL baslatiliyor..." -ForegroundColor Yellow
& (Join-Path $projectRoot "start-mysql.ps1")

Start-Sleep -Seconds 5

Write-Host "`n7. Veritabani olusturuluyor..." -ForegroundColor Yellow
& "$binDir\mysql.exe" -u root --protocol=TCP --host=127.0.0.1 --port=3306 -e "CREATE DATABASE IF NOT EXISTS varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "KURULUM TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "MySQL Baslat:" -ForegroundColor Yellow
Write-Host "  .\start-mysql.ps1`n" -ForegroundColor White

Write-Host "MySQL Durdur:" -ForegroundColor Yellow
Write-Host "  .\stop-mysql.ps1`n" -ForegroundColor White

Write-Host "Tablolari Olustur:" -ForegroundColor Yellow
Write-Host "  cd server" -ForegroundColor White
Write-Host "  node create-missing-tables.js`n" -ForegroundColor White

Write-Host ".env Ayarlari:" -ForegroundColor Yellow
Write-Host "  DB_HOST=127.0.0.1" -ForegroundColor White
Write-Host "  DB_PORT=3306" -ForegroundColor White
Write-Host "  DB_USER=root" -ForegroundColor White
Write-Host "  DB_PASSWORD=" -ForegroundColor White
Write-Host "  DB_NAME=varmi_db`n" -ForegroundColor White

Write-Host "TASINABILIRLIK:" -ForegroundColor Cyan
Write-Host "mysql-portable klasorunu yedekleyin." -ForegroundColor White
Write-Host "Yeni makinede start-mysql.ps1 calistirin.`n" -ForegroundColor White
