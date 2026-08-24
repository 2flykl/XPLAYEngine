@echo off
cd /d "%~dp0"
echo Starting XPLAY Screenshot-to-Blender World Lab on port 8791...
start "XPLAY Screenshot World Lab Server" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" http://localhost:8791/
exit
