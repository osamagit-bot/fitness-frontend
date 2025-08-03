@echo off
echo 🚀 Starting GymFitness Development Server...
echo 📡 WebSocket notifications: ENABLED
echo 🔄 Auto-reload: ENABLED
echo 🌐 Server: http://127.0.0.1:8000
echo ⚡ WebSocket: ws://127.0.0.1:8000/ws/
echo.
echo Press Ctrl+C to stop the server
echo.

daphne -b 127.0.0.1 -p 8000 --reload gymbackend.asgi:application