@echo off
cd /d %~dp0
if not exist node_modules (
  echo Installing dependencies...
  npm install
)
set PORT=8824
echo Starting XPLAY Style Divergence Lab V3 on port 8824...
node server.js
pause
