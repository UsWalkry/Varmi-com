# Frontend Production Build ve Serve
# Dev mode yerine production build çok daha hızlıdır

Write-Host "🔨 Frontend production build..." -ForegroundColor Yellow
cd "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui"
pnpm build

Write-Host ""
Write-Host "✅ Build tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Production preview başlatılıyor (Port 443)..." -ForegroundColor Yellow
Write-Host ""

# Preview server'ı başlat (production build'i serve eder)
pnpm preview
