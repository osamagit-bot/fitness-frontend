@echo off
echo 🚀 Starting GymFitness Production Server...
echo 📡 WebSocket notifications: ENABLED
echo 🔒 Production mode: ENABLED
echo 🌐 Server: http://0.0.0.0:8000
echo ⚡ WebSocket: ws://0.0.0.0:8000/ws/
echo.
echo Press Ctrl+C to stop the server
echo.

daphne -b 0.0.0.0 -p 8000 gymbackend.asgi:application