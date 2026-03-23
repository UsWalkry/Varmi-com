# Frontend'i Port 80'de Başlatma Scripti
# Administrator olarak çalıştırın!

$ErrorActionPreference = "Stop"

# Admin kontrolü
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Bu script Administrator olarak çalıştırılmalı!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Çözüm:" -ForegroundColor Yellow
    Write-Host "1. PowerShell'i 'Administrator olarak çalıştır' ile açın" -ForegroundColor White
    Write-Host "2. cd 'C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\shadcn-ui'" -ForegroundColor White
    Write-Host "3. .\start-port80.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "veya" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Port 5173 kullanmak için .env dosyasında VITE_PORT=5173 yapın" -ForegroundColor White
    exit 1
}

Write-Host "✅ Administrator izni var" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Frontend başlatılıyor (Port 80)..." -ForegroundColor Yellow
Write-Host ""

# shadcn-ui klasörüne git
Set-Location $PSScriptRoot

# pnpm dev çalıştır
pnpm dev
