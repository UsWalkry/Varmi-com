# mkcert ile gerçek SSL sertifikası oluştur
# Bu script mkcert indirip kurar ve localhost + varmii.com için sertifika oluşturur

$ErrorActionPreference = "Stop"

Write-Host "🔐 mkcert Kurulum ve Sertifika Oluşturma" -ForegroundColor Green
Write-Host ""

# mkcert binary'sini indir
$mkcertUrl = "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe"
$mkcertPath = "$PSScriptRoot\mkcert.exe"

if (!(Test-Path $mkcertPath)) {
    Write-Host "📥 mkcert indiriliyor..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $mkcertUrl -OutFile $mkcertPath
    Write-Host "✅ mkcert indirildi" -ForegroundColor Green
}
else {
    Write-Host "✅ mkcert zaten mevcut" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔒 Yerel CA (Certificate Authority) oluşturuluyor..." -ForegroundColor Yellow
Write-Host "⚠️  Güvenlik uyarısı çıkarsa 'Evet' deyin" -ForegroundColor Yellow
& $mkcertPath -install

Write-Host ""
Write-Host "📜 SSL sertifikaları oluşturuluyor..." -ForegroundColor Yellow

# SSL klasörünü oluştur
$sslDir = "$PSScriptRoot\ssl"
if (!(Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir | Out-Null
}

# Sertifika oluştur
Set-Location $sslDir
& $mkcertPath localhost varmii.com www.varmii.com 127.0.0.1 ::1

# Dosyaları yeniden adlandır
if (Test-Path "localhost+4.pem") {
    Move-Item -Path "localhost+4.pem" -Destination "cert.pem" -Force
    Move-Item -Path "localhost+4-key.pem" -Destination "key.pem" -Force
    Write-Host "✅ Sertifikalar oluşturuldu:" -ForegroundColor Green
    Write-Host "   📄 $sslDir\cert.pem" -ForegroundColor Cyan
    Write-Host "   🔑 $sslDir\key.pem" -ForegroundColor Cyan
}
else {
    Write-Host "❌ Sertifika oluşturulamadı" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Tamamlandı!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Sonraki Adımlar:" -ForegroundColor Yellow
Write-Host "1. Backend'i yeniden başlatın: pnpm dev" -ForegroundColor White
Write-Host "2. Tarayıcıda https://localhost:8787 veya https://varmii.com:8787" -ForegroundColor White
Write-Host "3. Artık güvenlik uyarısı ÇIKMAYACAK! ✅" -ForegroundColor Green
