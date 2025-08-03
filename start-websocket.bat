@echo off
title GymFitness WebSocket Server
echo ========================================
echo  🔌 GymFitness WebSocket Server
echo ========================================
echo.
echo Starting WebSocket server on port 8001...
echo WebSocket URL: ws://127.0.0.1:8001
echo.

cd gymbackend
call venv\Scripts\activate
daphne -p 8001 gymbackend.asgi:application