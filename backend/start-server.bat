@echo off
REM Launcher for backend server to ensure environment variables are set for this process only
set DB_USER=
set DB_NAME=
set DB_PASSWORD=
set PORT=5002
cd /d %~dp0
node server.js
pause
