# Security Update Deployment Script
# Tum guvenlik degisikliklerini Ubuntu sunucuya deploy eder

param(
    [string]$UbuntuIP = "192.168.1.116",
    [string]$UbuntuUser = "burak",
    [string]$ProjectPath = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Security Update Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: ${UbuntuUser}@${UbuntuIP}" -ForegroundColor Yellow
Write-Host "Project: $ProjectPath" -ForegroundColor Yellow
Write-Host ""

# Confirmation
$confirm = Read-Host "Deploy devam etsin mi? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment iptal edildi." -ForegroundColor Red
    exit
}

try {
    # Frontend already built - verify
    Write-Host ""
    Write-Host "Step 1: Frontend build kontrolu..." -ForegroundColor Green
    $frontendDist = "$ProjectPath\shadcn-ui\dist"
    if (!(Test-Path $frontendDist)) {
        throw "Frontend dist klasoru bulunamadi!"
    }
    Write-Host "   Frontend build OK" -ForegroundColor Green

    # Backend already built - verify
    Write-Host ""
    Write-Host "Step 2: Backend build kontrolu..." -ForegroundColor Green
    $backendDist = "$ProjectPath\server\dist"
    if (!(Test-Path $backendDist)) {
        throw "Backend dist klasoru bulunamadi!"
    }
    Write-Host "   Backend build OK" -ForegroundColor Green

    # Create remote directories
    Write-Host ""
    Write-Host "Step 3: Remote dizinler olusturuluyor..." -ForegroundColor Green
    ssh ${UbuntuUser}@${UbuntuIP} "mkdir -p ~/varmi-com/server ~/varmi-com/frontend"
    Write-Host "   Dizinler hazir" -ForegroundColor Green

    # Copy Backend
    Write-Host ""
    Write-Host "Step 4: Backend kopyalaniyor..." -ForegroundColor Green
    Write-Host "   Copying dist folder..." -ForegroundColor Yellow
    scp -r "$ProjectPath\server\dist" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    
    Write-Host "   Copying package files..." -ForegroundColor Yellow
    scp "$ProjectPath\server\package.json" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    scp "$ProjectPath\server\pnpm-lock.yaml" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    scp "$ProjectPath\server\ecosystem.config.js" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    scp "$ProjectPath\server\.env.example" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    
    Write-Host "   Backend kopyalandi" -ForegroundColor Green

    # Copy Frontend
    Write-Host ""
    Write-Host "Step 5: Frontend kopyalaniyor..." -ForegroundColor Green
    scp -r "$ProjectPath\shadcn-ui\dist\*" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/frontend/
    Write-Host "   Frontend kopyalandi" -ForegroundColor Green

    # Install dependencies and restart
    Write-Host ""
    Write-Host "Step 6: Backend kurulumu ve PM2 restart..." -ForegroundColor Green
    
    $remoteScript = @'
cd ~/varmi-com/server
echo "Installing production dependencies..."
pnpm install --prod
echo "Restarting PM2..."
pm2 restart varmi-mail-server || pm2 start ecosystem.config.js
pm2 save
echo "PM2 status:"
pm2 status
'@

    Write-Host "   Executing remote commands..." -ForegroundColor Yellow
    ssh ${UbuntuUser}@${UbuntuIP} $remoteScript
    Write-Host "   Backend kurulumu tamamlandi" -ForegroundColor Green

    # Success message
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Deployment Tamamlandi!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Sonraki adimlar:" -ForegroundColor Yellow
    Write-Host "1. Sunucuda .env kontrolu: ssh ${UbuntuUser}@${UbuntuIP}" -ForegroundColor White
    Write-Host "2. JWT_SECRET guncelleme: node generate-jwt-secret.js" -ForegroundColor White
    Write-Host "3. PM2 durumu: pm2 status" -ForegroundColor White
    Write-Host "4. PM2 logs: pm2 logs varmi-mail-server" -ForegroundColor White
    Write-Host "5. Test edin: https://${UbuntuIP}" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "Deployment basarisiz: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}
