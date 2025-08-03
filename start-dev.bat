@echo off
echo ========================================
echo  Starting GymFitness Development Server
echo ========================================
echo.

echo Starting Backend Server...
start "GymFitness Backend" cmd /k "cd gymbackend && venv\Scripts\activate && python manage.py runserver 127.0.0.1:8000"

timeout /t 3 /nobreak > nul

echo Starting WebSocket Server...
start "GymFitness WebSocket" cmd /k "cd gymbackend && venv\Scripts\activate && daphne -p 8001 gymbackend.asgi:application"

timeout /t 2 /nobreak > nul

echo Starting Frontend Server...
start "GymFitness Frontend" cmd /k "cd fitness-frontend && npm start"

echo.
echo All servers are starting...
echo - Frontend: http://localhost:3000
echo - Backend: http://127.0.0.1:8000
echo - WebSocket: ws://127.0.0.1:8001
echo - Admin: http://127.0.0.1:8000/admin
echo.
echo Press any key to close this window...
pause > nul