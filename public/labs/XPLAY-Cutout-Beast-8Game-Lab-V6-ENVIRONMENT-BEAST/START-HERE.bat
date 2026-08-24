@echo off
cd /d "%~dp0"
echo.
echo XPLAY Cutout Beast V6 - ENVIRONMENT BEAST
echo.
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
)
echo Starting on http://localhost:8833
set PORT=8833
node server.js
goto :eof
:fail
echo INSTALL FAILED.
pause
