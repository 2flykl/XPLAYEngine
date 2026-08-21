@echo off
cd /d "%~dp0"
if not exist package.json (
  echo ERROR: package.json not found.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
start "XPLAY DEV" cmd /k "npm run dev"
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173/vision-spatial-lab.html"
