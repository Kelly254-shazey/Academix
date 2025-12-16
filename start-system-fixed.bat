@echo off
echo Starting ClassTrack AI System on Port 5000...
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm start"
timeout /t 3

echo Starting Frontend...
cd ..\frontend
start "Frontend Server" cmd /k "npm start"

echo.
echo System started!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause