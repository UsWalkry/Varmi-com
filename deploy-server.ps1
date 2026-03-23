# ============================================================
#  Varmi.com Backend Deploy Script
#  Kullanim: .\deploy-server.ps1
#  Yaptiği: server/src/ → ZIP → Sunucu → pnpm build → PM2 restart
# ============================================================

$ErrorActionPreference = "Stop"

$SSH_HOST  = "192.168.1.102"
$SSH_USER  = "burak"
$SSH_PASS  = "root"
$PLINK     = "C:\Program Files\PuTTY\plink.exe"
$PSCP      = "C:\Program Files\PuTTY\pscp.exe"

$WORKSPACE = "C:\Users\Burak AYDIN\Desktop\Varmi-com-sql"
$SERVER_SRC = "$WORKSPACE\server\src"
$TSCONFIG   = "$WORKSPACE\server\tsconfig.json"
$ZIP_PATH   = "C:\Temp\varmi_server_src.zip"

$REMOTE_SERVER_DIR = "/home/burak/varmi-com/server"
$REMOTE_ZIP        = "/tmp/varmi_server_src.zip"
$EXTRACT_SCRIPT    = "/tmp/extract_server.py"

# ── 1. ZIP ──────────────────────────────────────────────────
Write-Host "`n[1/4] Kaynak dosyalar ZIP'leniyor..." -ForegroundColor Cyan

if (Test-Path $ZIP_PATH) { Remove-Item $ZIP_PATH -Force }

# src/ ve tsconfig.json zip'e ekle
$compress = @{
    Path            = $SERVER_SRC, $TSCONFIG
    DestinationPath = $ZIP_PATH
    CompressionLevel = "Fastest"
}
Compress-Archive @compress
Write-Host "      ZIP olusturuldu: $ZIP_PATH ($([math]::Round((Get-Item $ZIP_PATH).Length/1KB)) KB)" -ForegroundColor Green

# ── 2. UPLOAD ───────────────────────────────────────────────
Write-Host "`n[2/4] Sunucuya yukleniyor..." -ForegroundColor Cyan
& $PSCP -pw $SSH_PASS $ZIP_PATH "${SSH_USER}@${SSH_HOST}:${REMOTE_ZIP}"
if ($LASTEXITCODE -ne 0) { Write-Host "HATA: Upload basarisiz!" -ForegroundColor Red; exit 1 }
Write-Host "      Upload tamamlandi" -ForegroundColor Green

# ── 3. EXTRACT SCRIPT OLUSTUR (ilk seferde) ─────────────────
$extractScript = @'
import zipfile, os, shutil

zip_path   = '/tmp/varmi_server_src.zip'
server_dir = '/home/burak/varmi-com/server'

with zipfile.ZipFile(zip_path, 'r') as z:
    for member in z.namelist():
        # Windows backslash -> forward slash normalize
        member_norm = member.replace('\\', '/')
        if member_norm.endswith('/'):
            continue
        target = os.path.join(server_dir, member_norm)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with z.open(member) as src, open(target, 'wb') as dst:
            shutil.copyfileobj(src, dst)
print('EXTRACT_OK')
'@
$tmpExtract = "C:\Temp\extract_server.py"
$extractScript | Out-File -FilePath $tmpExtract -Encoding utf8
& $PSCP -pw $SSH_PASS $tmpExtract "${SSH_USER}@${SSH_HOST}:${EXTRACT_SCRIPT}"

# ── 4. EXTRACT + BUILD + RESTART ────────────────────────────
Write-Host "`n[3/4] Sunucuda extract + TypeScript build..." -ForegroundColor Cyan

$remoteCmd = "python3 $EXTRACT_SCRIPT && cd $REMOTE_SERVER_DIR && pnpm build 2>&1 | tail -5 && echo BUILD_OK"
$buildOutput = (& $PLINK -ssh "${SSH_USER}@${SSH_HOST}" -pw $SSH_PASS -batch $remoteCmd) -join "`n"
Write-Host $buildOutput

if ($buildOutput -notmatch "BUILD_OK") {
    Write-Host "`nHATA: Build basarisiz! PM2 restart YAPILMADI." -ForegroundColor Red
    Write-Host "Tam hata icin sunucuya bakin." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n[4/4] PM2 restart..." -ForegroundColor Cyan
$restartOut = & $PLINK -ssh "${SSH_USER}@${SSH_HOST}" -pw $SSH_PASS -batch "pm2 restart varmi-mail-server && sleep 2 && pm2 logs varmi-mail-server --lines 4 --nostream 2>&1 | tail -5"
Write-Host $restartOut

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " DEPLOY TAMAMLANDI " -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
