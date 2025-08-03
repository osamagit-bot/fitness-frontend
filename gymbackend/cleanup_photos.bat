@echo off
cd /d "%~dp0"
venv311\Scripts\python.exe cleanup_photos.py
echo Photo cleanup completed at %date% %time%