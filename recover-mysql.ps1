# MySQL Database Recovery Script

Write-Host "Starting MySQL database recovery..." -ForegroundColor Cyan

# Stop MySQL
Write-Host "`n1. Stopping MySQL..." -ForegroundColor Yellow
Stop-Process -Name mysqld -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove corrupted database files
Write-Host "`n2. Removing corrupted database..." -ForegroundColor Yellow
$dbPath = "C:\xampp\mysql\data\varmi_db"
if (Test-Path $dbPath) {
    Remove-Item $dbPath -Recurse -Force
    Write-Host "   Removed corrupted database files" -ForegroundColor Green
}

# Remove innodb recovery setting if present
Write-Host "`n3. Cleaning my.ini configuration..." -ForegroundColor Yellow
$myIniPath = "C:\xampp\mysql\bin\my.ini"
$content = Get-Content $myIniPath -Raw
if ($content -match 'innodb_force_recovery') {
    $content = $content -replace 'innodb_force_recovery=\d+\r?\n?', ''
    Set-Content $myIniPath -Value $content -NoNewline
    Write-Host "   Removed recovery mode setting" -ForegroundColor Green
}

# Start MySQL
Write-Host "`n4. Starting MySQL..." -ForegroundColor Yellow
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=$myIniPath" -WindowStyle Hidden
Start-Sleep -Seconds 8

# Check if MySQL started
$process = Get-Process mysqld -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "   MySQL started successfully (PID: $($process.Id))" -ForegroundColor Green
} else {
    Write-Host "   MySQL failed to start" -ForegroundColor Red
    exit 1
}

# Create fresh database
Write-Host "`n5. Creating fresh database..." -ForegroundColor Yellow
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS varmi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Write-Host "   Database created" -ForegroundColor Green

Write-Host "`nRecovery complete! MySQL is running with a fresh database." -ForegroundColor Green
Write-Host "Next step: Run schema creation scripts from server directory" -ForegroundColor Cyan
