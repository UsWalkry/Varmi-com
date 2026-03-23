# Local DNS Fix for varmii.com
# Bu script, aynı network'teki PC'lerde domain'i local IP'ye yönlendirir
# YÖNETİCİ YETKİSİ İLE ÇALIŞTIRIN (Run as Administrator)

Write-Host "🔧 Fixing local DNS for varmii.com..." -ForegroundColor Cyan

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$localIP = "192.168.1.106"
$domain = "varmii.com"
$wwwDomain = "www.varmii.com"

# Backup hosts file
$backupPath = "$hostsPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $hostsPath $backupPath
Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green

# Check if entries already exist
$hostsContent = Get-Content $hostsPath
$entryExists = $hostsContent | Select-String -Pattern "$localIP\s+$domain"

if ($entryExists) {
    Write-Host "⚠️  Entry already exists in hosts file" -ForegroundColor Yellow
    Write-Host "Current content:" -ForegroundColor Gray
    $hostsContent | Select-String -Pattern "varmii.com"
} else {
    # Add entries
    $newEntries = @"

# Local network fix for varmii.com
# Added: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
$localIP $domain
$localIP $wwwDomain
"@
    
    Add-Content -Path $hostsPath -Value $newEntries
    Write-Host "✅ Added entries to hosts file:" -ForegroundColor Green
    Write-Host "   $localIP $domain" -ForegroundColor White
    Write-Host "   $localIP $wwwDomain" -ForegroundColor White
}

# Flush DNS cache
Write-Host "`n🔄 Flushing DNS cache..." -ForegroundColor Cyan
ipconfig /flushdns | Out-Null
Write-Host "✅ DNS cache flushed" -ForegroundColor Green

# Test resolution
Write-Host "`n🧪 Testing DNS resolution..." -ForegroundColor Cyan
$result = Resolve-DnsName $domain -Type A -ErrorAction SilentlyContinue

if ($result.IPAddress -contains $localIP) {
    Write-Host "✅ SUCCESS: $domain now resolves to $localIP" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Resolution may take a moment" -ForegroundColor Yellow
    Write-Host "   Wait 10 seconds and test in browser" -ForegroundColor Gray
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Open browser" -ForegroundColor White
Write-Host "   2. Go to: https://varmii.com" -ForegroundColor White
Write-Host "   3. Should now work on local network!" -ForegroundColor Green

Write-Host "`n💡 To revert changes:" -ForegroundColor Yellow
Write-Host "   Copy-Item '$backupPath' '$hostsPath'" -ForegroundColor Gray

Read-Host "`nPress Enter to exit"
