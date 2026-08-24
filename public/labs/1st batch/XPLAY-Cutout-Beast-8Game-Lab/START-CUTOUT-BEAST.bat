@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo.
echo Starting XPLAY Cutout Beast 8-Game Lab...
echo Open http://localhost:8832
echo.
set PORT=8832
node server.js
pause
