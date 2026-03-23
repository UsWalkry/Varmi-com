# ======================================
# MANUEL DEPLOY KOMUTLARı
# Schema.org Structured Data Implementation
# ======================================

Write-Host "🚀 Manuel Deploy Başlıyor..." -ForegroundColor Cyan
Write-Host ""

# Backend Dosyaları
Write-Host "📦 BACKEND DOSYALARI:" -ForegroundColor Yellow
Write-Host "1. schemaGenerator.js" -ForegroundColor Green
Write-Host "   scp 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\dist\utils\schemaGenerator.js' root@192.168.1.116:~/varmi-com/server/dist/utils/"
Write-Host ""
Write-Host "2. listings.js (güncellenmiş)" -ForegroundColor Green
Write-Host "   scp 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\dist\routes\listings.js' root@192.168.1.116:~/varmi-com/server/dist/routes/"
Write-Host ""
Write-Host "3. index.js (güncellenmiş - opsiyonel, Redis için zaten güncel)" -ForegroundColor Green
Write-Host "   scp 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\dist\index.js' root@192.168.1.116:~/varmi-com/server/dist/"
Write-Host ""

# Frontend Dosyaları
Write-Host "📱 FRONTEND DOSYALARI:" -ForegroundColor Yellow
Write-Host "Tüm frontend dist klasörünü kopyala:" -ForegroundColor Green
Write-Host "   scp -r 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui\dist\*' root@192.168.1.116:/var/www/varmii.com/public_html/"
Write-Host ""

# PM2 Restart
Write-Host "🔄 BACKEND RESTART:" -ForegroundColor Yellow
Write-Host "   ssh root@192.168.1.116 'cd ~/varmi-com/server && pm2 restart varmi-mail-server'"
Write-Host ""

# Test
Write-Host "✅ TEST:" -ForegroundColor Yellow
Write-Host "   curl -s https://varmii.com/api/listings/active | ConvertFrom-Json | Select-Object -ExpandProperty schema"
Write-Host ""

Write-Host "📝 NOT: Her komut için SSH şifresi girilecek." -ForegroundColor Cyan
Write-Host "💡 TIP: SSH key eklemek için:" -ForegroundColor Cyan
Write-Host "   ssh-keygen -t rsa" -ForegroundColor Gray
Write-Host "   ssh-copy-id root@192.168.1.116" -ForegroundColor Gray
Write-Host ""

# Hızlı deploy için all-in-one komut
Write-Host "⚡ TEK KOMUTLA DEPLOY:" -ForegroundColor Magenta
Write-Host ""
Write-Host "# Backend files" -ForegroundColor Gray
Write-Host "scp 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\dist\utils\schemaGenerator.js' root@192.168.1.116:~/varmi-com/server/dist/utils/" -ForegroundColor Gray
Write-Host "scp 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\dist\routes\listings.js' root@192.168.1.116:~/varmi-com/server/dist/routes/" -ForegroundColor Gray
Write-Host ""
Write-Host "# Frontend dist" -ForegroundColor Gray
Write-Host "scp -r 'c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui\dist\*' root@192.168.1.116:/var/www/varmii.com/public_html/" -ForegroundColor Gray
Write-Host ""
Write-Host "# Restart backend (Linux shell)" -ForegroundColor Gray
Write-Host "ssh root@192.168.1.116" -ForegroundColor Gray
Write-Host "cd ~/varmi-com/server" -ForegroundColor Gray
Write-Host "pm2 restart varmi-mail-server" -ForegroundColor Gray
Write-Host "pm2 logs --lines 20" -ForegroundColor Gray
