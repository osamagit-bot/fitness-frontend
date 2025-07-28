@echo off
echo 🔧 Installing Backup System Dependencies...
echo ==========================================

:: Install Python dependencies
echo 📦 Installing Python packages...
pip install -r backup_requirements.txt

if %ERRORLEVEL% EQU 0 (
    echo ✅ Dependencies installed successfully!
    echo.
    echo 📋 Next steps:
    echo   1. Add settings from backup_config.py to your settings.py
    echo   2. Test: python manage.py backup_status
    echo   3. Create first backup: .\backup.bat
    echo.
) else (
    echo ❌ Failed to install dependencies
    echo Please check your Python environment and try again
)

pause