@echo off
title XPLAY 3.1 RELEASE CANDIDATE
cd /d "%~dp0"
echo ============================================================
echo XPLAY 3.1 RELEASE CANDIDATE MASTER
echo ============================================================
echo.
echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 goto fail
echo.
echo [2/3] Running release-candidate verification...
call npm run verify:rc
if errorlevel 1 goto fail
echo.
echo [3/3] Starting XPLAY...
call npm run dev
goto :eof
:fail
echo.
echo STARTUP STOPPED. Fix the error above before continuing.
pause
