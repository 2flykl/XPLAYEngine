@echo off
cd /d "%~dp0"
set PORT=8855
echo XPLAY Open World FPV Side Test
node server.js
pause
