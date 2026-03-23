# Ubuntu Server Deployment Script
# Bu script projeyi Windows PC'den Ubuntu server'a deploy eder

param(
    [Parameter(Mandatory=$true)]
    [string]$UbuntuIP,
    
    [Parameter(Mandatory=$true)]
    [string]$UbuntuUser,
    
    [string]$ProjectPath = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🚀 Varmi.com Ubuntu Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Target: ${UbuntuUser}@${UbuntuIP}" -ForegroundColor Yellow
Write-Host "📁 Project: $ProjectPath" -ForegroundColor Yellow
Write-Host ""

# Confirmation
$confirm = Read-Host "Deploy işlemine devam edilsin mi? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Deployment iptal edildi." -ForegroundColor Red
    exit
}

try {
    # 1. Backend Build
    Write-Host ""
    Write-Host "📦 Step 1: Backend build ediliyor..." -ForegroundColor Green
    Set-Location "$ProjectPath\server"
    
    if (!(Test-Path "node_modules")) {
        Write-Host "   Installing dependencies..." -ForegroundColor Yellow
        pnpm install
    }
    
    Write-Host "   Building..." -ForegroundColor Yellow
    pnpm build
    
    if (!(Test-Path "dist")) {
        throw "Backend build failed - dist folder not found"
    }
    Write-Host "   ✅ Backend build tamamlandı" -ForegroundColor Green

    # 2. Frontend Build
    Write-Host ""
    Write-Host "📦 Step 2: Frontend build ediliyor..." -ForegroundColor Green
    Set-Location "$ProjectPath\shadcn-ui"
    
    # Check .env file
    if (!(Test-Path ".env")) {
        Write-Host "   ⚠️  Warning: .env file not found" -ForegroundColor Yellow
    } else {
        Write-Host "   Checking environment variables..." -ForegroundColor Yellow
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "VITE_SERVER_URL=") {
            Write-Host "   VITE_SERVER_URL is configured" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  VITE_SERVER_URL not found in .env" -ForegroundColor Yellow
        }
    }
    
    if (!(Test-Path "node_modules")) {
        Write-Host "   Installing dependencies..." -ForegroundColor Yellow
        pnpm install
    }
    
    Write-Host "   Building..." -ForegroundColor Yellow
    pnpm build
    
    if (!(Test-Path "dist")) {
        throw "Frontend build failed - dist folder not found"
    }
    Write-Host "   ✅ Frontend build tamamlandı" -ForegroundColor Green

    # 3. Create remote directories
    Write-Host ""
    Write-Host "📁 Step 3: Remote dizinler oluşturuluyor..." -ForegroundColor Green
    ssh ${UbuntuUser}@${UbuntuIP} "mkdir -p ~/varmi-com/server ~/varmi-com/frontend ~/varmi-com/sql"
    Write-Host "   ✅ Dizinler hazır" -ForegroundColor Green

    # 4. Copy SQL files
    Write-Host ""
    Write-Host "📤 Step 4: SQL dosyaları kopyalanıyor..." -ForegroundColor Green
    scp "$ProjectPath\create_admin_tables.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    scp "$ProjectPath\create_orders_tables.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    scp "$ProjectPath\create_user_addresses_table.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    scp "$ProjectPath\add_listing_approval_system.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    scp "$ProjectPath\add_offer_approval_system.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    scp "$ProjectPath\update_order_status_system.sql" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/sql/
    Write-Host "   ✅ SQL dosyaları kopyalandı" -ForegroundColor Green

    # 5. Copy Backend
    Write-Host ""
    Write-Host "📤 Step 5: Backend kopyalanıyor..." -ForegroundColor Green
    Write-Host "   Copying dist folder..." -ForegroundColor Yellow
    scp -r "$ProjectPath\server\dist" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    
    Write-Host "   Copying package files..." -ForegroundColor Yellow
    scp "$ProjectPath\server\package.json" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    scp "$ProjectPath\server\pnpm-lock.yaml" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    scp "$ProjectPath\server\ecosystem.config.js" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    
    Write-Host "   Copying .env.example..." -ForegroundColor Yellow
    scp "$ProjectPath\server\.env.example" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    
    if (Test-Path "$ProjectPath\server\ssl") {
        Write-Host "   Copying SSL certificates..." -ForegroundColor Yellow
        scp -r "$ProjectPath\server\ssl" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/server/
    } else {
        Write-Host "   ⚠️  SSL folder not found, skipping..." -ForegroundColor Yellow
    }
    
    Write-Host "   ✅ Backend kopyalandı" -ForegroundColor Green

    # 6. Copy Frontend
    Write-Host ""
    Write-Host "📤 Step 6: Frontend kopyalanıyor..." -ForegroundColor Green
    scp -r "$ProjectPath\shadcn-ui\dist\*" ${UbuntuUser}@${UbuntuIP}:~/varmi-com/frontend/
    Write-Host "   ✅ Frontend kopyalandı" -ForegroundColor Green

    # 7. Install dependencies and restart backend
    Write-Host ""
    Write-Host "🔧 Step 7: Backend kurulumu yapılıyor..." -ForegroundColor Green
    
    $remoteScript = 'cd ~/varmi-com/server && echo "Installing dependencies..." && pnpm install --prod && if [ ! -f .env ]; then cp .env.example .env && echo "Warning: .env created from template, please edit it!"; fi && if command -v pm2 > /dev/null; then pm2 restart varmi-mail-server 2>/dev/null || pm2 start ecosystem.config.js && pm2 save && echo "Backend running with PM2"; else echo "PM2 not installed, please install: npm install -g pm2"; fi'

    Write-Host "   Executing remote commands..." -ForegroundColor Yellow
    ssh ${UbuntuUser}@${UbuntuIP} $remoteScript
    Write-Host "   ✅ Backend kurulumu tamamlandı" -ForegroundColor Green

    # 8. Check Nginx
    Write-Host ""
    Write-Host "🌐 Step 8: Nginx kontrol ediliyor..." -ForegroundColor Green
    
    $nginxCheck = 'if command -v nginx > /dev/null; then if [ -f /etc/nginx/sites-available/varmi.com ]; then echo "Nginx config exists" && sudo nginx -t && sudo systemctl reload nginx && echo "Nginx reloaded"; else echo "Warning: Nginx config not found, please create manually"; fi; else echo "Nginx not installed"; fi'

    ssh ${UbuntuUser}@${UbuntuIP} $nginxCheck
    Write-Host ""

    # 9. Success message
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Deployment Tamamlandi!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Sonraki adimlar:" -ForegroundColor Yellow
    Write-Host "1. SSH ile Ubuntuya baglanin: ssh ${UbuntuUser}@${UbuntuIP}" -ForegroundColor White
    Write-Host "2. .env dosyasini duzenleyin: nano ~/varmi-com/server/.env" -ForegroundColor White
    Write-Host "3. MySQL database olusturun (QUICKSTART_UBUNTU.mdye bakin)" -ForegroundColor White
    Write-Host "4. Backend durumunu kontrol edin: pm2 status" -ForegroundColor White
    Write-Host "5. Tarayicida test edin: https://${UbuntuIP}" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Detayli bilgi: QUICKSTART_UBUNTU.md ve UBUNTU_DEPLOYMENT.md" -ForegroundColor Yellow

} catch {
    Write-Host ""
    Write-Host "Deployment basarisiz: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Hata detaylari icin loglari kontrol edin" -ForegroundColor Yellow
    exit 1
}
