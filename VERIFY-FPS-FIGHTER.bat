@echo off
cd /d "%~dp0"
call npm run verify:plx
pause
