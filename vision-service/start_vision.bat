@echo off
cd /d "%~dp0"
echo XPLAY Visual Intelligence Service
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 127.0.0.1 --port 8790
pause
