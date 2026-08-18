@echo off
title XPLAY 3.0 FOUNDRY PREFLIGHT
cd /d "%~dp0"
echo ============================================================
echo XPLAY 3.0 ANTIGRAVITY FOUNDRY PREFLIGHT
echo ============================================================
echo.
call npm install
if errorlevel 1 goto fail
echo.
call npm run verify:foundry
if errorlevel 1 goto fail
echo.
echo READY FOR ANTIGRAVITY.
echo Open this folder as the Antigravity workspace:
cd
echo.
echo Read ANTIGRAVITY_START_HERE.md and paste ANTIGRAVITY_FIRST_COMMAND.txt.
goto :eof
:fail
echo.
echo PREFLIGHT FAILED. Fix the error above before starting the Foundry.
pause
