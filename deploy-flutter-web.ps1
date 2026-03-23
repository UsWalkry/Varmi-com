#!/usr/bin/env pwsh
# Flutter Web - Sunucuda Build & Deploy Script
# Kaynak kodu sunucuya gönderir, orada build eder, public_html/mobil/'e kopyalar

$ErrorActionPreference = "Stop"

# ─── Konfigürasyon ────────────────────────────────────────────────────────────
$SSH_HOST    = "192.168.1.102"
$SSH_USER    = "burak"
$SSH_PASS    = "root"
$SSH_PORT    = "22"
$FLUTTER_SRC = "c:\Users\Burak AYDIN\Desktop\Varmi-com-sql\varmi_flutter"
$REMOTE_TMP  = "/tmp/varmi_flutter_build"
$REMOTE_WEB  = "/var/www/html/mobil"
$FLUTTER_SDK = "/opt/flutter"
# ──────────────────────────────────────────────────────────────────────────────

function SSH-Run($cmd) {
    plink -ssh -P $SSH_PORT -pw $SSH_PASS "${SSH_USER}@${SSH_HOST}" -batch $cmd
    if ($LASTEXITCODE -ne 0) { throw "SSH komutu basarisiz: $cmd" }
}

function SCP-Send($localPath, $remotePath) {
    pscp -P $SSH_PORT -pw $SSH_PASS -r -batch "$localPath" "${SSH_USER}@${SSH_HOST}:$remotePath"
    if ($LASTEXITCODE -ne 0) { throw "SCP transfer basarisiz: $localPath -> $remotePath" }
}

Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Flutter Web  →  varmii.com/mobil/       " -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Sunucu  : $SSH_USER@$SSH_HOST" -ForegroundColor Yellow
Write-Host "Hedef   : $REMOTE_WEB"          -ForegroundColor Yellow
Write-Host ""

# ─── ADIM 1: Flutter proje dosyalarını sunucuya kopyala ───────────────────────
Write-Host "[1/5] Flutter kaynak kodu sunucuya kopyalaniyor..." -ForegroundColor Cyan

# Önce remote temizle
SSH-Run "rm -rf $REMOTE_TMP && mkdir -p $REMOTE_TMP"

# pscp ile gönder
Write-Host "  -> SCP ile transfer ediliyor (bu biraz sürebilir)..." -ForegroundColor Gray
SCP-Send "$FLUTTER_SRC" "/tmp/"

# Uzakta klasör adını standartlaştır
SSH-Run "mv /tmp/varmi_flutter $REMOTE_TMP 2>/dev/null || true; ls $REMOTE_TMP/pubspec.yaml && echo OK"

Write-Host "  [OK] Kaynak kod aktarildi." -ForegroundColor Green

# ─── ADIM 2: Flutter SDK kontrolü / kurulumu ──────────────────────────────────
Write-Host "[2/5] Flutter SDK kontrol ediliyor..." -ForegroundColor Cyan

$flutterCheck = plink -ssh -P $SSH_PORT -pw $SSH_PASS "${SSH_USER}@${SSH_HOST}" -batch "test -f $FLUTTER_SDK/bin/flutter && echo MEVCUT || echo YOK"

if ($flutterCheck -match "YOK") {
    Write-Host "  -> Flutter SDK bulunamadi, kuruluyor..." -ForegroundColor Yellow
    Write-Host "  -> (Bu islem 3-5 dakika surebilir)" -ForegroundColor Gray

    SSH-Run @"
set -e
apt-get install -y curl git unzip xz-utils zip libglu1-mesa 2>/dev/null || true
cd /opt
git clone https://github.com/flutter/flutter.git -b stable --depth 1 flutter
export PATH="\$PATH:/opt/flutter/bin"
flutter precache --web
flutter config --enable-web
echo 'export PATH="\$PATH:/opt/flutter/bin"' >> /root/.bashrc
echo Flutter kurulumu tamamlandi
"@
    Write-Host "  [OK] Flutter SDK kuruldu." -ForegroundColor Green
} else {
    Write-Host "  [OK] Flutter SDK mevcut: $FLUTTER_SDK" -ForegroundColor Green
}

# ─── ADIM 3: Dependencies yükle ve Build al ───────────────────────────────────
Write-Host "[3/5] Flutter web build aliniyor..." -ForegroundColor Cyan
Write-Host "  -> flutter pub get + build web (3-5 dakika surebilir)..." -ForegroundColor Gray

SSH-Run @"
set -e
export PATH="\$PATH:$FLUTTER_SDK/bin"
cd $REMOTE_TMP
flutter pub get --no-color
flutter build web \
  --release \
  --base-href /mobil/ \
  --dart-define=PRODUCTION=true \
  --web-renderer canvaskit \
  --no-color
echo "BUILD TAMAMLANDI"
"@

Write-Host "  [OK] Build tamamlandi." -ForegroundColor Green

# ─── ADIM 4: Build çıktısını public_html/mobil/ dizinine taşı ─────────────────
Write-Host "[4/5] Dosyalar public_html/mobil/ dizinine kopyalaniyor..." -ForegroundColor Cyan

SSH-Run @"
set -e
mkdir -p $REMOTE_WEB
# Önce ihtiyati backup al
if [ -f "$REMOTE_WEB/index.html" ]; then
    cp -r $REMOTE_WEB /tmp/mobil_backup_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi
# Yenisini kopyala
cp -r $REMOTE_TMP/build/web/. $REMOTE_WEB/
echo "KOPYALAMA TAMAM"
# Dosya izinleri
chmod -R 755 $REMOTE_WEB
"@

Write-Host "  [OK] Dosyalar kopyalandi." -ForegroundColor Green

# ─── ADIM 5: Temizlik ─────────────────────────────────────────────────────────
Write-Host "[5/5] Gecici dosyalar temizleniyor..." -ForegroundColor Cyan
SSH-Run "rm -rf $REMOTE_TMP"
Write-Host "  [OK] Temizlik tamam." -ForegroundColor Green

# ─── Sonuç ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Green
Write-Host "  DEPLOY BAŞARILI!                        " -ForegroundColor Green
Write-Host "══════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  URL: https://varmii.com/mobil/" -ForegroundColor White
Write-Host ""
Write-Host "Mevcut site (/) etkilenmedi." -ForegroundColor Gray
Write-Host ""
