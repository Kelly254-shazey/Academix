@echo off
echo Starting ClassTrack Development Environment...
echo.

echo [1/2] Starting Backend Server (Port 5002)...
cd backend
start "Backend Server" cmd /k "npm start"
cd ..

echo [2/2] Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Application (Port 3000)...
cd frontend
start "Frontend App" cmd /k "npm start"
cd ..

echo.
echo ✅ Development environment started!
echo.
echo Backend API: http://localhost:5002
echo Frontend App: http://localhost:3000
echo Health Check: http://localhost:5002/api/health
echo.
echo Press any key to exit...
pause > nul