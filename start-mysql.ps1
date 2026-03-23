$mariadbDir = Join-Path $PSScriptRoot "mysql-portable"
Write-Host "MySQL baslatiliyor..." -ForegroundColor Green

# Eski process varsa durdur
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# MySQL'i baslat
Start-Process "$mariadbDir\bin\mysqld.exe" -ArgumentList "--defaults-file=`"$mariadbDir\my.ini`"" -WindowStyle Hidden
Start-Sleep -Seconds 6

# Kontrol et
if (Get-Process mysqld -ErrorAction SilentlyContinue) {
    Write-Host "MySQL baslatildi! (127.0.0.1:3306)" -ForegroundColor Green
    Write-Host "Backend baslatmak icin: cd server; pnpm dev" -ForegroundColor Cyan
} else {
    Write-Host "MySQL baslatilamadi!" -ForegroundColor Red
    Write-Host "Error log: $mariadbDir\data\*.err" -ForegroundColor Yellow
}
