@echo off
title XPLAY 2.7 BIG GULP
cd /d "%~dp0"
echo ============================================================
echo XPLAY 2.7 VISUAL INTELLIGENCE BIG GULP
echo ============================================================
start "XPLAY Vision" cmd /k "cd /d ""%~dp0vision-service"" && python -m pip install -r requirements.txt && set XPLAY_VISION_PROVIDER=opencv && python -m uvicorn app:app --host 127.0.0.1 --port 8790"
call npm install
call npm run dev
