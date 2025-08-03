#!/usr/bin/env python
"""
Production server startup script
Runs Daphne optimized for production
"""
import os
import sys
import django

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.settings')
    django.setup()
    
    print("🚀 Starting GymFitness Production Server...")
    print("📡 WebSocket notifications: ENABLED")
    print("🔒 Production mode: ENABLED")
    print("🌐 Server: http://0.0.0.0:8000")
    print("⚡ WebSocket: ws://0.0.0.0:8000/ws/")
    print("\nPress Ctrl+C to stop the server\n")
    
    # Start Daphne for production
    os.system('daphne -b 0.0.0.0 -p 8000 gymbackend.asgi:application')