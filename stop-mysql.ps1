Write-Host "MySQL durduruluyor..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Durduruldu" -ForegroundColor Green
