@echo off
title XPLAY Beast Pipeline Lab
cd /d "%~dp0"

echo.
echo ==========================================
echo XPLAY VISION - INTERPRETER - ASSET MANIFEST
echo ==========================================
echo.
echo This launcher should be placed in your XPLAYEngine repo root.
echo It will NOT change or display your Gemini key.
echo.

if not exist package.json (
  echo ERROR: package.json was not found here.
  echo Copy the contents of this BeastPack into the ROOT of XPLAYEngine first.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting XPLAY web + API...
start "XPLAY Beast API" cmd /k "cd /d ""%cd%"" && npm run dev"

echo Waiting for the servers...
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173/beast-lab.html"

echo.
echo Beast Lab opened in your browser.
echo Keep the server window open while testing.
echo.
pause
