# Portable MariaDB Kurulum
Write-Host "Portable MariaDB kuruluyor..." -ForegroundColor Cyan

$projectRoot = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
$mariadbDir = Join-Path $projectRoot "mysql-portable"
$dataDir = Join-Path $mariadbDir "data"

# MariaDB 10.11 indirme linki (stable, portable ZIP)
$url = "https://archive.mariadb.org/mariadb-10.11.8/winx64-packages/mariadb-10.11.8-winx64.zip"
$zipFile = Join-Path $projectRoot "mariadb.zip"

Write-Host "`n1. MariaDB indiriliyor (350MB)..." -ForegroundColor Yellow
if (-not (Test-Path $zipFile)) {
    Invoke-WebRequest -Uri $url -OutFile $zipFile -UseBasicParsing
    Write-Host "   Indirildi" -ForegroundColor Green
} else {
    Write-Host "   Zaten var" -ForegroundColor Green
}

Write-Host "`n2. Cikariliyor..." -ForegroundColor Yellow
if (Test-Path $mariadbDir) {
    Remove-Item $mariadbDir -Recurse -Force
}

Expand-Archive -Path $zipFile -DestinationPath $projectRoot -Force
$extracted = Get-ChildItem $projectRoot -Filter "mariadb-*" -Directory | Select-Object -First 1
Rename-Item $extracted.FullName $mariadbDir -Force

Write-Host "`n3. Yapilandiriliyor..." -ForegroundColor Yellow

# my.ini olustur
$myIni = @"
[mysqld]
port=3306
basedir=$($mariadbDir -replace '\\','/')
datadir=$($dataDir -replace '\\','/')
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
bind-address=127.0.0.1
max_connections=100

[client]
port=3306
default-character-set=utf8mb4
"@

Set-Content (Join-Path $mariadbDir "my.ini") -Value $myIni

Write-Host "`n4. Database initialize..." -ForegroundColor Yellow
& "$mariadbDir\bin\mysql_install_db.exe" --datadir="$dataDir" --default-user

Write-Host "`n5. Start/Stop scriptleri..." -ForegroundColor Yellow

# start-mysql.ps1
$startScript = @'
$mariadbDir = Join-Path $PSScriptRoot "mysql-portable"
Write-Host "MySQL baslatiliyor..." -ForegroundColor Green
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process "$mariadbDir\bin\mysqld.exe" -ArgumentList "--defaults-file=$mariadbDir\my.ini" -WindowStyle Hidden
Start-Sleep -Seconds 5
if (Get-Process mysqld -ErrorAction SilentlyContinue) {
    Write-Host "MySQL calisyor! (127.0.0.1:3306)" -ForegroundColor Green
} else {
    Write-Host "Baslatılamadi" -ForegroundColor Red
}
'@

Set-Content (Join-Path $projectRoot "start-mysql.ps1") -Value $startScript

# stop-mysql.ps1
Set-Content (Join-Path $projectRoot "stop-mysql.ps1") -Value @'
Write-Host "MySQL durduruluyor..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Durduruldu" -ForegroundColor Green
'@

Write-Host "`n6. MySQL baslatiliyor..." -ForegroundColor Yellow
& (Join-Path $projectRoot "start-mysql.ps1")

Write-Host "`n7. Veritabani olusturuluyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
& "$mariadbDir\bin\mysql.exe" -u root --protocol=TCP -e "CREATE DATABASE IF NOT EXISTS varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

Write-Host "`n====================" -ForegroundColor Green
Write-Host "KURULUM TAMAM!" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green
Write-Host "`nBaslat: .\start-mysql.ps1" -ForegroundColor Cyan
Write-Host "Durdur: .\stop-mysql.ps1" -ForegroundColor Cyan
Write-Host "`nTablolari olustur:" -ForegroundColor Yellow
Write-Host "  cd server" -ForegroundColor White
Write-Host "  node create-missing-tables.js" -ForegroundColor White
Write-Host "`n.env:" -ForegroundColor Yellow
Write-Host "  DB_HOST=127.0.0.1" -ForegroundColor White
Write-Host "  DB_PORT=3306" -ForegroundColor White
Write-Host "  DB_USER=root" -ForegroundColor White
Write-Host "  DB_PASSWORD=" -ForegroundColor White
Write-Host "  DB_NAME=varmi_db" -ForegroundColor White
