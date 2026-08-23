@echo off
cd /d %~dp0
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
echo Starting XPLAY Gameplay Polish Dual-Style Lab...
node server.js
pause
