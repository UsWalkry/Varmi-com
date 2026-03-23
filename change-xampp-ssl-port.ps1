# XAMPP Apache SSL Portunu Değiştirme
# XAMPP'ı kapatıp bu scripti çalıştırın

$ErrorActionPreference = "Stop"

Write-Host "🔧 XAMPP Apache SSL Port Değişikliği (443 -> 8443)" -ForegroundColor Green
Write-Host ""

# XAMPP yolu (yaygın kurulum yerleri)
$xamppPaths = @(
    "C:\xampp",
    "C:\Program Files\xampp",
    "C:\Program Files (x86)\xampp"
)

$xamppPath = $null
foreach ($path in $xamppPaths) {
    if (Test-Path $path) {
        $xamppPath = $path
        break
    }
}

if (-not $xamppPath) {
    Write-Host "❌ XAMPP bulunamadı!" -ForegroundColor Red
    Write-Host "Manuel olarak yapın:" -ForegroundColor Yellow
    Write-Host "1. C:\xampp\apache\conf\extra\httpd-ssl.conf açın" -ForegroundColor White
    Write-Host "2. 'Listen 443' -> 'Listen 8443' yapın" -ForegroundColor White
    Write-Host "3. '<VirtualHost _default_:443>' -> '<VirtualHost _default_:8443>' yapın" -ForegroundColor White
    Write-Host "4. Apache'yi yeniden başlatın" -ForegroundColor White
    exit 1
}

Write-Host "✅ XAMPP bulundu: $xamppPath" -ForegroundColor Green
Write-Host ""

# SSL config dosyası
$sslConfigPath = "$xamppPath\apache\conf\extra\httpd-ssl.conf"

if (-not (Test-Path $sslConfigPath)) {
    Write-Host "❌ SSL config bulunamadı: $sslConfigPath" -ForegroundColor Red
    exit 1
}

# Yedek al
$backupPath = "$sslConfigPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $sslConfigPath $backupPath
Write-Host "💾 Yedek oluşturuldu: $backupPath" -ForegroundColor Yellow
Write-Host ""

# Dosyayı oku
$content = Get-Content $sslConfigPath -Raw

# Port değişiklikleri
$originalContent = $content
$content = $content -replace 'Listen 443', 'Listen 8443'
$content = $content -replace '<VirtualHost _default_:443>', '<VirtualHost _default_:8443>'
$content = $content -replace 'ServerName www.example.com:443', 'ServerName www.example.com:8443'

if ($content -eq $originalContent) {
    Write-Host "⚠️  Hiçbir değişiklik yapılmadı (zaten 8443 olabilir)" -ForegroundColor Yellow
} else {
    # Kaydet
    Set-Content $sslConfigPath $content -NoNewline
    Write-Host "✅ SSL portu 443 -> 8443 olarak değiştirildi" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Yellow
Write-Host "1. XAMPP Control Panel'den Apache'yi yeniden başlatın" -ForegroundColor White
Write-Host "2. phpMyAdmin artık: https://localhost:8443/phpmyadmin/" -ForegroundColor Cyan
Write-Host "3. Varmı.com artık: https://localhost:443 veya https://varmii.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Geri almak için: $backupPath dosyasını geri yükleyin" -ForegroundColor Yellow
