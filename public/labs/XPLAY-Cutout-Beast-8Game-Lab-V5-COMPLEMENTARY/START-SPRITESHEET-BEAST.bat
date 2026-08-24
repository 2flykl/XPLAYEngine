@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
set PORT=8833
node server.js
pause
