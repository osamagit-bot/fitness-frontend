@echo off
title GymFitness Auto Startup
echo ========================================
echo  🏋️ GymFitness Auto Startup System
echo ========================================
echo.

REM Wait for system to fully boot
timeout /t 10 /nobreak > nul

echo 🚀 Starting Backend Server...
start "GymFitness Backend" cmd /k "cd /d %~dp0gymbackend && call venv\Scripts\activate && python manage.py runserver 127.0.0.1:8000"

echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo 📡 Starting WebSocket Server...
start "GymFitness WebSocket" cmd /k "cd /d %~dp0gymbackend && call venv\Scripts\activate && daphne -p 8001 gymbackend.asgi:application"

echo ⏳ Waiting for WebSocket to initialize...
timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server...
start "GymFitness Frontend" cmd /k "cd /d %~dp0fitness-frontend && npm start"

echo ⏳ Waiting for frontend to initialize...
timeout /t 5 /nobreak > nul

echo ✅ All services started successfully!
echo.
echo 📱 Access your application:
echo - Frontend: http://localhost:3000
echo - Backend API: http://127.0.0.1:8000
echo - WebSocket: ws://127.0.0.1:8001
echo - Admin Panel: http://127.0.0.1:8000/admin
echo.
echo 🔔 WebSocket notifications are ENABLED on port 8001
echo.
echo This window will close in 10 seconds...
timeout /t 10 /nobreak > nul
exit