@echo off
REM Chrome'u yönetici olarak çalıştır
echo Chrome'u YÖNETİCİ olarak başlatıyorum...

REM Chrome'un yolunu bul
set CHROME_PATH=

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe
)

if "%CHROME_PATH%"=="" (
    echo Chrome bulunamadı! Edge deneniyor...
    start microsoft-edge:https://varmii.com
) else (
    echo Chrome başlatılıyor: %CHROME_PATH%
    powershell -Command "Start-Process '%CHROME_PATH%' -ArgumentList 'https://varmii.com' -Verb RunAs"
)

pause
