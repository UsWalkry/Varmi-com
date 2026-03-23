@echo off
echo ========================================
echo    Varmi.com Frontend Starter (Port 80)
echo ========================================
echo.
echo Port 80 icin Administrator gerekldir...
echo.

:: Admin kontrolü ve yükseltme
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator izni var
    echo.
    cd /d "%~dp0"
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-port80.ps1"
) else (
    echo [!] Administrator izni yok, yukseltiliyor...
    echo.
    powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c cd /d \"%~dp0\" && powershell.exe -ExecutionPolicy Bypass -File \"%~dp0start-port80.ps1\"' -Verb RunAs"
)
