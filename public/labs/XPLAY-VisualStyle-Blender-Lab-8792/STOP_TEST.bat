@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8792 ^| findstr LISTENING') do taskkill /PID %%a /F
echo Port 8792 stopped if it was running.
pause
