@echo off
chcp 65001
echo ==========================================
echo       Goeun Quiz App Launcher
echo ==========================================
echo.
echo Stopping any processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting Development Server...
echo Access at: http://localhost:5173
echo.
cd /d "%~dp0"
call npm run dev
pause
