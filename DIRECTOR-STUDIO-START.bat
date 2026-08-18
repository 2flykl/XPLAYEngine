@echo off
title XPLAY 2.9 DIRECTOR STUDIO
cd /d "%~dp0"
echo ============================================================
echo XPLAY 2.9 DIRECTOR STUDIO DOUBLE GULP
echo ============================================================
echo.
echo [1/3] Installing Node dependencies...
call npm install
if errorlevel 1 goto fail
echo.
echo [2/3] Verifying all 10 engines, including FPS + Fighting...
call npm run verify:plx
if errorlevel 1 goto fail
echo.
echo [3/3] Starting XPLAY...
call npm run dev
goto :eof
:fail
echo.
echo XPLAY startup stopped because verification failed.
pause
