# Portable MySQL Kurulum Scripti
Write-Host "Portable MySQL kurulumu baslatiliyor..." -ForegroundColor Cyan

$projectRoot = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
$mysqlDir = Join-Path $projectRoot "mysql-portable"
$dataDir = Join-Path $mysqlDir "data"
$binDir = Join-Path $mysqlDir "bin"

# MySQL indirme linki (Windows ZIP - 8.0.40)
$mysqlZipUrl = "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.40-winx64.zip"
$mysqlZipFile = Join-Path $projectRoot "mysql-8.0.40-winx64.zip"

Write-Host "`n1. MySQL indiriliyor (yaklasik 200MB)..." -ForegroundColor Yellow
if (-not (Test-Path $mysqlZipFile)) {
    Invoke-WebRequest -Uri $mysqlZipUrl -OutFile $mysqlZipFile -UseBasicParsing
    Write-Host "   Indirildi" -ForegroundColor Green
} else {
    Write-Host "   Zaten indirilmis" -ForegroundColor Green
}

Write-Host "`n2. MySQL cikarilyor..." -ForegroundColor Yellow
if (Test-Path $mysqlDir) {
    Remove-Item $mysqlDir -Recurse -Force
}
Expand-Archive -Path $mysqlZipFile -DestinationPath $projectRoot -Force

# Klasor adini duzelt
$extractedFolder = Get-ChildItem $projectRoot -Filter "mysql-8.0*" -Directory | Select-Object -First 1
if ($extractedFolder) {
    Rename-Item $extractedFolder.FullName $mysqlDir -Force
}

Write-Host "   Cikarildi: $mysqlDir" -ForegroundColor Green

Write-Host "`n3. MySQL yapilandiriliyor..." -ForegroundColor Yellow

# my.ini dosyasi olustur
$myIniContent = @"
[mysqld]
# Temel ayarlar
port=3306
basedir=$mysqlDir
datadir=$dataDir
socket=$mysqlDir\mysql.sock
tmpdir=$mysqlDir\tmp

# Karakter seti
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci

# InnoDB ayarlari
default-storage-engine=INNODB
innodb_buffer_pool_size=256M
innodb_log_file_size=64M
innodb_flush_log_at_trx_commit=1

# Baglanti ayarlari
max_connections=100
max_allowed_packet=16M

# Log ayarlari
log_error=$mysqlDir\error.log

# Guvenlik
bind-address=127.0.0.1

[client]
port=3306
socket=$mysqlDir\mysql.sock

[mysql]
default-character-set=utf8mb4
"@

Set-Content -Path (Join-Path $mysqlDir "my.ini") -Value $myIniContent -Encoding UTF8

# tmp klasoru olustur
$tmpDir = Join-Path $mysqlDir "tmp"
if (-not (Test-Path $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}

Write-Host "`n4. MySQL initialize ediliyor..." -ForegroundColor Yellow
& "$binDir\mysqld.exe" --defaults-file="$mysqlDir\my.ini" --initialize-insecure --console

Write-Host "`n5. Baslangic scripti olusturuluyor..." -ForegroundColor Yellow

# Start script
$startScriptContent = @"
# MySQL Baslat
`$mysqlDir = `"`$PSScriptRoot\mysql-portable`"
`$pidFile = Join-Path `$mysqlDir "mysql.pid"

# Zaten calisiyorsa durdur
if (Test-Path `$pidFile) {
    `$pid = Get-Content `$pidFile
    Stop-Process -Id `$pid -Force -ErrorAction SilentlyContinue
    Remove-Item `$pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "MySQL baslatiliyor..." -ForegroundColor Green
Start-Process -FilePath "`$mysqlDir\bin\mysqld.exe" -ArgumentList "--defaults-file=`$mysqlDir\my.ini" -WindowStyle Hidden

Start-Sleep -Seconds 5

if (Get-Process mysqld -ErrorAction SilentlyContinue) {
    Write-Host "MySQL baslatildi!" -ForegroundColor Green
    Write-Host "Port: 3306" -ForegroundColor Cyan
    Write-Host "Root password: (bos)" -ForegroundColor Cyan
} else {
    Write-Host "MySQL baslatilamadi! Log dosyasini kontrol edin:" -ForegroundColor Red
    Write-Host "`$mysqlDir\error.log" -ForegroundColor Yellow
}
"@

Set-Content -Path (Join-Path $projectRoot "start-mysql.ps1") -Value $startScriptContent -Encoding UTF8

# Stop script
$stopScriptContent = @"
# MySQL Durdur
`$mysqlDir = `"`$PSScriptRoot\mysql-portable`"
Write-Host "MySQL durduruluyor..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Write-Host "MySQL durduruldu." -ForegroundColor Green
"@

Set-Content -Path (Join-Path $projectRoot "stop-mysql.ps1") -Value $stopScriptContent -Encoding UTF8

Write-Host "`n6. Veritabani olusturuluyor..." -ForegroundColor Yellow

# MySQL'i baslat
Start-Process -FilePath "$binDir\mysqld.exe" -ArgumentList "--defaults-file=$mysqlDir\my.ini" -WindowStyle Hidden
Start-Sleep -Seconds 8

# Veritabani olustur
& "$binDir\mysql.exe" -u root --protocol=TCP --host=127.0.0.1 --port=3306 -e "CREATE DATABASE IF NOT EXISTS varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KURULUM TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MySQL Baslatmak icin:" -ForegroundColor Yellow
Write-Host "  .\start-mysql.ps1" -ForegroundColor White
Write-Host ""
Write-Host "MySQL Durdurmak icin:" -ForegroundColor Yellow
Write-Host "  .\stop-mysql.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Tablolari olusturmak icin:" -ForegroundColor Yellow
Write-Host "  cd server" -ForegroundColor White
Write-Host "  node create-missing-tables.js" -ForegroundColor White
Write-Host ""
Write-Host "Baglanti bilgileri (.env):" -ForegroundColor Yellow
Write-Host "  DB_HOST=127.0.0.1" -ForegroundColor White
Write-Host "  DB_PORT=3306" -ForegroundColor White
Write-Host "  DB_USER=root" -ForegroundColor White
Write-Host "  DB_PASSWORD=" -ForegroundColor White
Write-Host "  DB_NAME=varmi_db" -ForegroundColor White
Write-Host ""
Write-Host "YEDEKLEME:" -ForegroundColor Cyan
Write-Host "Tum mysql-portable klasorunu yedekleyin." -ForegroundColor White
Write-Host "Yeni makinede bu klasoru kopyalayip start-mysql.ps1 calistirin." -ForegroundColor White
