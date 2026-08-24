@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo XPLAY OPENAI64 FRESH TEST
echo ============================================================
echo This lab runs on port 8792 so it cannot collide with old 8788 labs.
echo.
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8792"
node server.js
pause
