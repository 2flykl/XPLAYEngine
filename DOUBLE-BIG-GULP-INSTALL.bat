@echo off
cd /d "%~dp0"
echo.
echo =============================================
echo   XPLAY PLX ENGINE 1.5 - DOUBLE BIG GULP
echo =============================================
echo.
call npm install
if errorlevel 1 goto :error
echo.
echo Starting XPLAY...
call npm run dev
goto :eof
:error
echo.
echo Installation failed. Review the error above.
pause
