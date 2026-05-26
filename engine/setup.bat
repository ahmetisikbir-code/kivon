@echo off
echo === KIVON Workflow Engine — Kurulum ===
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [HATA] Node.js kurulu degil! https://nodejs.org adresinden indirin.
    pause
    exit /b 1
)
echo [OK] Node.js: 
node --version

REM Check Groq API Key
if "%GROQ_API_KEY%"=="" (
    echo.
    echo [UYARI] GROQ_API_KEY bulunamadi.
    echo.
    echo Groq API key almak icin:
    echo 1. https://console.groq.com adresine git
    echo 2. Kayit ol (Google ile kolayca)
    echo 3. API Keys bolumunden key olustur
    echo 4. Asagidaki gibi ayarla:
    echo.
    echo    set GROQ_API_KEY=gsk_your_key_here
    echo    node server.js
    echo.
) else (
    echo [OK] GROQ_API_KEY mevcut
)

REM Install dependencies (none needed but check)
echo.
echo [OK] Sifir bagimlilik - sadece Node.js yeterli.

echo.
echo === CALISTIRMAK ICIN: ===
echo    node server.js
echo.
echo === TEST ETMEK ICIN: ===
echo    curl -X POST http://localhost:3002/trigger/whatsapp-ai ^
echo      -H "Content-Type: application/json" ^
echo      -d "{\"message\":\"Merhaba\"}"
echo.
pause
