# Manual Ubuntu Deployment Commands
# Bu komutlari Windows PowerShell'de sirasiyla calistirin

# 1. Backend build
Write-Host "Step 1: Backend build..." -ForegroundColor Green
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server"
pnpm install
pnpm build

# 2. Frontend build  
Write-Host "Step 2: Frontend build..." -ForegroundColor Green
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui"
pnpm install
pnpm build

# 3. Ubuntu'da klasor olustur
Write-Host "Step 3: Creating directories on Ubuntu..." -ForegroundColor Green
ssh varmii@192.168.1.116 "mkdir -p ~/varmi-com/server ~/varmi-com/frontend ~/varmi-com/sql"

# 4. SQL dosyalarini kopyala
Write-Host "Step 4: Copying SQL files..." -ForegroundColor Green
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
scp *.sql varmii@192.168.1.116:~/varmi-com/sql/

# 5. Backend kopyala
Write-Host "Step 5: Copying backend..." -ForegroundColor Green
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server"
scp -r dist varmii@192.168.1.116:~/varmi-com/server/
scp package.json pnpm-lock.yaml ecosystem.config.js .env.example varmii@192.168.1.116:~/varmi-com/server/
scp -r ssl varmii@192.168.1.116:~/varmi-com/server/

# 6. Frontend kopyala
Write-Host "Step 6: Copying frontend..." -ForegroundColor Green
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui"
scp -r dist/* varmii@192.168.1.116:~/varmi-com/frontend/

# 7. Backend setup (Ubuntu'da)
Write-Host "Step 7: Setting up backend on Ubuntu..." -ForegroundColor Green
ssh varmii@192.168.1.116 "cd ~/varmi-com/server && pnpm install --prod && cp .env.example .env"

Write-Host ""
Write-Host "Deployment tamamlandi!" -ForegroundColor Green
Write-Host "Sonraki adimlar:" -ForegroundColor Yellow
Write-Host "1. SSH ile Ubuntu'ya baglanin: ssh varmii@192.168.1.116" -ForegroundColor White
Write-Host "2. MySQL kurulumu yapın (QUICKSTART_UBUNTU.md)" -ForegroundColor White
Write-Host "3. .env duzenlein: nano ~/varmi-com/server/.env" -ForegroundColor White
Write-Host "4. PM2 ile backend baslatın: cd ~/varmi-com/server && pm2 start ecosystem.config.js" -ForegroundColor White
Write-Host "5. Nginx kurulumu yapın (QUICKSTART_UBUNTU.md)" -ForegroundColor White
