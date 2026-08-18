@echo off
echo XPLAY 2.7 prerequisite check
echo.
where node >nul 2>nul && echo [OK] Node found || echo [NEEDED] Install Node.js LTS
where npm >nul 2>nul && echo [OK] npm found || echo [NEEDED] npm comes with Node.js
where python >nul 2>nul && echo [OK] Python found || echo [NEEDED] Install Python 3.11 or 3.12
where git >nul 2>nul && echo [OK] Git found || echo [OPTIONAL] Git not found
echo.
echo Standard visual mode: BIG-GULP-START.bat
echo Maximum local semantic mode: MAX-VISUAL-START.bat
pause
