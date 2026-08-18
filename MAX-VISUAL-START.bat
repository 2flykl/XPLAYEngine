@echo off
title XPLAY 2.7 MAX VISUAL
cd /d "%~dp0"
echo ============================================================
echo XPLAY 2.7 MAX VISUAL MODE
 echo Semantic segmentation + object recognition + optional AI remaster
 echo First install may take a while because Torch model weights are large.
echo ============================================================
start "XPLAY MAX Vision" cmd /k "cd /d ""%~dp0vision-service"" && python -m pip install -r requirements-max.txt && set XPLAY_VISION_PROVIDER=maskrcnn && python -m uvicorn app:app --host 127.0.0.1 --port 8790"
call npm install
call npm run dev
