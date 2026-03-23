# Console.log'ları Temizleme Script'i
# mysql-api.ts dosyasındaki console.log'ları log() ile değiştir

$filePath = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui\src\lib\mysql-api.ts"

Write-Host "📝 Dosya okunuyor..." -ForegroundColor Yellow
$content = Get-Content $filePath -Raw

# İlk 30 satır zaten değiştirildi, onları atlayalım
# console.log -> log
$originalCount = ([regex]::Matches($content, 'console\.log')).Count
$content = $content -replace 'console\.log', 'log'

# console.error -> logError  
$errorCount = ([regex]::Matches($content, 'console\.error')).Count
$content = $content -replace 'console\.error', 'logError'

# Kaydet
Set-Content $filePath $content -NoNewline

Write-Host "✅ Tamamlandı!" -ForegroundColor Green
Write-Host "   console.log değiştirildi: $originalCount" -ForegroundColor Cyan
Write-Host "   console.error değiştirildi: $errorCount" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production build'de bu log'lar gösterilmeyecek! 🚀" -ForegroundColor Green
