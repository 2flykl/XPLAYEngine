@echo off
setlocal
title XPLAY Visual Style to Blender Lab 8792
cd /d "%~dp0"

echo.
echo ============================================================
echo   XPLAY VISUAL STYLE -^> BLENDER LAB
echo   EXPECTED PORT: 8792
echo   FOLDER: %CD%
echo ============================================================
echo.

if not exist "server.js" (
  echo ERROR: server.js is missing from this folder.
  pause
  exit /b 1
)

echo Checking whether port 8792 is already in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8792" ^| findstr "LISTENING"') do (
  echo Stopping old process on 8792: PID %%a
  taskkill /PID %%a /F >nul 2>&1
)

echo Starting the NEW Visual Style -^> Blender server on 8792...
start "XPLAY Visual Blender Server 8792" cmd /k "cd /d ""%CD%"" && node server.js"

echo Waiting for server...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 20;$i++){ Start-Sleep -Milliseconds 500; try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',8792); $c.Close(); $ok=$true; break } catch {} }; if($ok){exit 0}else{exit 1}"

if errorlevel 1 (
  echo.
  echo ERROR: Nothing started on port 8792.
  echo Look at the separate server window for the exact error.
  pause
  exit /b 1
)

echo.
echo PASS: server is listening on 8792.
echo Opening the correct page...
start "" "http://localhost:8792/"
exit /b 0
