# phpMyAdmin Kurulum Scripti
$mysqlDir = Join-Path $PSScriptRoot "mysql-portable"
$phpMyAdminDir = Join-Path $mysqlDir "phpmyadmin"

Write-Host "📦 phpMyAdmin indiriliyor..." -ForegroundColor Cyan

# phpMyAdmin son sürümünü indir
$phpMyAdminUrl = "https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.zip"
$zipPath = Join-Path $PSScriptRoot "phpmyadmin.zip"

try {
    Invoke-WebRequest -Uri $phpMyAdminUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "✅ İndirildi" -ForegroundColor Green
    
    # ZIP'i aç
    Write-Host "📂 Dosyalar çıkarılıyor..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath $mysqlDir -Force
    
    # Klasörü yeniden adlandır
    $extractedDir = Join-Path $mysqlDir "phpMyAdmin-5.2.1-all-languages"
    if (Test-Path $extractedDir) {
        if (Test-Path $phpMyAdminDir) {
            Remove-Item $phpMyAdminDir -Recurse -Force
        }
        Rename-Item $extractedDir $phpMyAdminDir
    }
    
    # config.inc.php oluştur
    $configPath = Join-Path $phpMyAdminDir "config.inc.php"
    $configContent = @"
<?php
declare(strict_types=1);

`$cfg['blowfish_secret'] = '$(New-Guid)';

`$i = 0;
`$i++;
`$cfg['Servers'][`$i]['auth_type'] = 'config';
`$cfg['Servers'][`$i]['host'] = '127.0.0.1';
`$cfg['Servers'][`$i]['compress'] = false;
`$cfg['Servers'][`$i]['AllowNoPassword'] = true;
`$cfg['Servers'][`$i]['user'] = 'root';
`$cfg['Servers'][`$i]['password'] = '';

`$cfg['UploadDir'] = '';
`$cfg['SaveDir'] = '';
"@
    
    Set-Content -Path $configPath -Value $configContent -Encoding UTF8
    
    # Cleanup
    Remove-Item $zipPath -Force
    
    Write-Host "" -ForegroundColor Green
    Write-Host "✅ phpMyAdmin kuruldu!" -ForegroundColor Green
    Write-Host "" -ForegroundColor Yellow
    Write-Host "⚠️  phpMyAdmin'i kullanmak için PHP gerekli!" -ForegroundColor Yellow
    Write-Host "   1. PHP indirin: https://windows.php.net/download/" -ForegroundColor Cyan
    Write-Host "   2. Veya XAMPP'nin PHP'sini kullanın" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Yellow
    Write-Host "📂 phpMyAdmin konumu: $phpMyAdminDir" -ForegroundColor Cyan
    Write-Host "🌐 PHP ile çalıştırmak için:" -ForegroundColor Cyan
    Write-Host "   cd `"$phpMyAdminDir`"" -ForegroundColor White
    Write-Host "   php -S localhost:8080" -ForegroundColor White
    Write-Host "   Tarayıcıda aç: http://localhost:8080" -ForegroundColor White
    
} catch {
    Write-Host "❌ Hata: $_" -ForegroundColor Red
    Write-Host "Manuel indirme: https://www.phpmyadmin.net/downloads/" -ForegroundColor Yellow
}
