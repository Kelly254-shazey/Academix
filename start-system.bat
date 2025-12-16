@echo off
echo Starting ClassTrack AI System...
echo.

echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "npm start"
cd ..

echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Application...
cd frontend
start "Frontend App" cmd /k "npm start"
cd ..

echo.
echo ✅ System started successfully!
echo Backend: http://localhost:5002
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul