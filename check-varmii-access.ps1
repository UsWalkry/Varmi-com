# Varmii.com External Access Health Check
# DNS + HTTPS + API check
# Usage: powershell -ExecutionPolicy Bypass -File .\check-varmii-access.ps1

$ErrorActionPreference = 'Stop'

$domain = 'varmii.com'
$wwwDomain = 'www.varmii.com'
$healthUrl = 'https://varmii.com/api/health'

function Write-Section {
    param([string]$Title)
    Write-Host "`n===========================================" -ForegroundColor DarkGray
    Write-Host "[CHECK] $Title" -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor DarkGray
}

function Test-DnsFromResolver {
    param(
        [string]$Name,
        [string]$Server
    )

    try {
        $result = Resolve-DnsName -Name $Name -Type A -Server $Server -ErrorAction Stop
        $ips = $result | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress -Unique

        if (-not $ips -or $ips.Count -eq 0) {
            Write-Host "[FAIL] $Name @ $Server -> A record not found" -ForegroundColor Red
            return $false
        }

        $privateIps = $ips | Where-Object {
            $_ -match '^10\.' -or
            $_ -match '^192\.168\.' -or
            $_ -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.' -or
            $_ -match '^127\.'
        }

        if ($privateIps) {
            Write-Host "[WARN] $Name @ $Server -> $($ips -join ', ') (PRIVATE IP detected)" -ForegroundColor Yellow
            return $false
        }

        Write-Host "[OK] $Name @ $Server -> $($ips -join ', ')" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[FAIL] $Name @ $Server -> DNS query error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-HttpHead {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -TimeoutSec 20
        Write-Host "[OK] $Url -> HTTP $($response.StatusCode)" -ForegroundColor Green
        return $true
    }
    catch {
        $webResponse = $_.Exception.Response
        if ($webResponse -and $webResponse.StatusCode) {
            $code = [int]$webResponse.StatusCode
            Write-Host "[WARN] $Url -> HTTP $code" -ForegroundColor Yellow
            return $true
        }

        Write-Host "[FAIL] $Url -> Access error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "Starting Varmii.com access check..." -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

$allPassed = $true

Write-Section 'Local DNS Check'
try {
    $localA = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop |
        Where-Object { $_.IPAddress } |
        Select-Object -ExpandProperty IPAddress -Unique

    if ($localA) {
        Write-Host "[INFO] Local resolver ($domain): $($localA -join ', ')" -ForegroundColor White

        $localPrivate = $localA | Where-Object {
            $_ -match '^10\.' -or
            $_ -match '^192\.168\.' -or
            $_ -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.' -or
            $_ -match '^127\.'
        }

        if ($localPrivate) {
            Write-Host "[WARN] Local DNS returns private IP. This is not normal for external access." -ForegroundColor Yellow
            $allPassed = $false
        }
    } else {
        Write-Host "[WARN] Local resolver did not return an A record." -ForegroundColor Yellow
        $allPassed = $false
    }
}
catch {
    Write-Host "[FAIL] Local DNS query failed: $($_.Exception.Message)" -ForegroundColor Red
    $allPassed = $false
}

Write-Section 'Public DNS Check'
$dnsChecks = @(
    @{ Name = $domain; Server = '1.1.1.1' },
    @{ Name = $domain; Server = '8.8.8.8' },
    @{ Name = $wwwDomain; Server = '1.1.1.1' },
    @{ Name = $wwwDomain; Server = '8.8.8.8' }
)

foreach ($check in $dnsChecks) {
    $ok = Test-DnsFromResolver -Name $check.Name -Server $check.Server
    if (-not $ok) { $allPassed = $false }
}

Write-Section 'HTTPS Check'
$httpChecks = @(
    'https://varmii.com',
    'https://www.varmii.com',
    $healthUrl
)

foreach ($url in $httpChecks) {
    $ok = Test-HttpHead -Url $url
    if (-not $ok) { $allPassed = $false }
}

Write-Section 'Summary'
if ($allPassed) {
    Write-Host '[OK] Overall result: No critical issue detected for external access.' -ForegroundColor Green
    Write-Host '[INFO] If issue continues, client DNS cache / ISP cache is likely.' -ForegroundColor White
    exit 0
}

Write-Host '[FAIL] Overall result: At least one critical check failed.' -ForegroundColor Red
Write-Host 'Suggestions:' -ForegroundColor Yellow
Write-Host '  1) ipconfig /flushdns' -ForegroundColor White
Write-Host '  2) Clear browser DNS cache (chrome://net-internals/#dns)' -ForegroundColor White
Write-Host '  3) Verify Cloudflare DNS records and proxy mode' -ForegroundColor White
Write-Host '  4) Verify origin server ports 80/443 are open' -ForegroundColor White
exit 1
