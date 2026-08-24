@echo off
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8791 ^| findstr LISTENING') do (
  taskkill /PID %%a /F
)
echo Port 8791 server stopped if it was running.
pause
