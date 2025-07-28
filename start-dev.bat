@echo off
echo ========================================
echo  Starting GymFitness Development Server
echo ========================================
echo.

echo Starting Backend Server...
start "Django Backend" cmd /k "cd gymbackend && venv\Scripts\activate && python manage.py runserver"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "React Frontend" cmd /k "cd fitness-frontend && npm run dev"

echo.
echo Both servers are starting...
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:5173
echo - Admin: http://localhost:8000/admin
echo.
echo Press any key to close this window...
pause > nul