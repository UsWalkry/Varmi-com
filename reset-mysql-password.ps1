# MySQL Root Şifresini Sıfırla
$mysqlDir = Join-Path $PSScriptRoot "mysql-portable"
$initFile = Join-Path $mysqlDir "init-reset.sql"
$dataDir = Join-Path $mysqlDir "data"

Write-Host "MySQL root sifresi sifirlaniyor..." -ForegroundColor Cyan

# MySQL'i durdur
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Init dosyası oluştur
$sqlContent = "FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY '';
ALTER USER 'root'@'::1' IDENTIFIED BY '';
FLUSH PRIVILEGES;"

Set-Content -Path $initFile -Value $sqlContent -Encoding ASCII

Write-Host "MySQL guvenli modda baslatiliyor..." -ForegroundColor Yellow

# MySQL'i init-file ile başlat
$process = Start-Process "$mysqlDir\bin\mysqld.exe" -ArgumentList "--defaults-file=`"$mysqlDir\my.ini`"", "--init-file=`"$initFile`"" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 8

# MySQL durumunu kontrol et
if (Get-Process mysqld -ErrorAction SilentlyContinue) {
    Write-Host "MySQL baslatildi, sifre sifirlaniyor..." -ForegroundColor Green
    Start-Sleep -Seconds 3
    
    # MySQL'i yeniden başlat (normal mod)
    Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Init dosyasını sil
    Remove-Item $initFile -Force -ErrorAction SilentlyContinue
    
    # Normal başlat
    Start-Process "$mysqlDir\bin\mysqld.exe" -ArgumentList "--defaults-file=`"$mysqlDir\my.ini`"" -WindowStyle Hidden
    Start-Sleep -Seconds 5
    
    # Test baglantisi
    Write-Host "Baglanti test ediliyor..." -ForegroundColor Cyan
    $testResult = & "$mysqlDir\bin\mysql.exe" -u root --protocol=TCP --host=127.0.0.1 -e "SELECT 'OK' as status;" 2>&1
    
    if ($testResult -match "OK") {
        Write-Host "" -ForegroundColor Green
        Write-Host "Basarili! Root sifresi sifirlandi" -ForegroundColor Green
        Write-Host "" -ForegroundColor Yellow
        Write-Host "VS Code'da su bilgilerle baglan:" -ForegroundColor Cyan
        Write-Host "   Host: 127.0.0.1" -ForegroundColor White
        Write-Host "   Port: 3306" -ForegroundColor White
        Write-Host "   Username: root" -ForegroundColor White
        Write-Host "   Password: (bos)" -ForegroundColor White
        Write-Host "   Database: varmi_db" -ForegroundColor White
    } else {
        Write-Host "Test basarisiz: $testResult" -ForegroundColor Red
    }
} else {
    Write-Host "MySQL baslatilamadi!" -ForegroundColor Red
    Write-Host "Error log: $dataDir\*.err" -ForegroundColor Yellow
}
