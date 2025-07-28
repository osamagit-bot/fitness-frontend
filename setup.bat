@echo off
echo ========================================
echo  GymFitness Club Management System Setup
echo ========================================
echo.

echo [1/6] Setting up Backend...
cd gymbackend
echo Creating virtual environment...
python -m venv venv
call venv\Scripts\activate

echo Installing Python dependencies...
pip install -r requirements.txt

echo Running database migrations...
python manage.py migrate

echo Creating superuser (follow prompts)...
python manage.py createsuperuser

echo.
echo [2/6] Setting up Frontend...
cd ..\fitness-frontend
echo Installing Node.js dependencies...
npm install

echo.
echo [3/6] Setup complete!
echo.
echo To start the application:
echo 1. Backend: cd gymbackend && venv\Scripts\activate && python manage.py runserver
echo 2. Frontend: cd fitness-frontend && npm run dev
echo.
echo Access the application at:
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - Admin Panel: http://localhost:8000/admin
echo.
pause