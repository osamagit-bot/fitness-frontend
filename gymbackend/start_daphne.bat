@echo off
REM Batch file to start Daphne ASGI server for the fitnessbackend project

echo Starting Daphne ASGI server on port 8000...
daphne -p 8000 gymbackend.asgi:application
