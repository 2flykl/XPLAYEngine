@echo off
setlocal
cd /d "%~dp0\..\..\..\.."

echo.
echo ========================================
echo   XPLAY Blender MCP World Lab Launcher
echo ========================================
echo.
echo Repo: %CD%
echo.

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel%==0 goto OPENLAB

echo Starting XPLAY server on port 8788...
if not exist "server\server.js" (
  echo ERROR: Could not find server\server.js
  echo Run this BAT only from the lab inside the XPLAYEngine repo structure.
  pause
  exit /b 1
)

start "XPLAY Server" /min cmd /c "cd /d "%CD%" && node server\server.js"

echo Waiting for server...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing 'http://localhost:8788/labs/blender-mcp-world-lab/index.html' -TimeoutSec 1; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){$ok=$true;break} } catch{}; Start-Sleep -Milliseconds 400 }; if($ok){exit 0}else{exit 1}"
if not %errorlevel%==0 (
  echo ERROR: Server did not become available on port 8788.
  echo Check that Node.js is installed and server\server.js starts normally.
  pause
  exit /b 1
)

:OPENLAB
echo Opening lab through localhost...
start "" "http://localhost:8788/labs/blender-mcp-world-lab/index.html"
echo.
echo IMPORTANT: Do not open index.html directly with file://
echo The GLB and manifest require HTTP localhost loading.
echo.
exit /b 0
