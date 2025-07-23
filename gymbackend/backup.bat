@echo off
:: =============================================================================
:: GYM MANAGEMENT SYSTEM - DATABASE BACKUP UTILITY
:: =============================================================================
:: Production & Development Ready
:: Creates clean JSON backups without debug output
:: =============================================================================

setlocal enabledelayedexpansion

echo 🗄️ Gym Database Backup Utility v2.0
echo =====================================

:: Create backups directory
if not exist "backups" mkdir backups

:: Generate timestamp
for /f "usebackq delims=" %%i in (`powershell -command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set timestamp=%%i

:: Determine backup type
set backup_type=manual
if "%1"=="auto" set backup_type=auto

echo 📦 Creating clean database backup...
echo    Type: %backup_type%
echo    Time: %timestamp%

:: Create clean backup (excludes temporary data)
python manage.py dumpdata --natural-foreign --natural-primary --indent=2 --exclude=sessions --exclude=admin.logentry --exclude=contenttypes --exclude=auth.permission > backups\gym_backup_%timestamp%.json 2>nul

if %ERRORLEVEL% EQU 0 (
    :: Verify JSON format
    python -c "import json; data=json.load(open('backups/gym_backup_%timestamp%.json')); print(f'✅ Valid backup: {len(data)} records')" 2>nul
    
    if !ERRORLEVEL! EQU 0 (
        echo ✅ Backup created successfully!
        echo    File: backups\gym_backup_%timestamp%.json
        
        :: Show file size
        for %%f in (backups\gym_backup_%timestamp%.json) do (
            set /a size_kb=%%~zf/1024
            echo    Size: !size_kb! KB
        )
        
        :: Auto-cleanup old backups (keep last 7 days)
        if "%backup_type%"=="auto" (
            echo 🧹 Cleaning old backups...
            forfiles /p backups /s /m gym_backup_*.json /d -7 /c "cmd /c del @path" 2>nul
        )
        
        echo 📊 Current backups:
        dir /b backups\gym_backup_*.json 2>nul | find /c /v "" > temp_count.txt
        set /p backup_count=<temp_count.txt
        del temp_count.txt
        echo    Total: !backup_count! backup files
        
    ) else (
        echo ❌ Backup file is corrupted - contains invalid JSON
        del backups\gym_backup_%timestamp%.json 2>nul
        exit /b 1
    )
) else (
    echo ❌ Backup creation failed
    exit /b 1
)

:: Don't pause for automated runs
if "%backup_type%"=="auto" goto :eof

echo.
echo 🎉 Backup completed successfully!
echo.
echo Next steps:
echo   - Test restore: .\restore.bat backups\gym_backup_%timestamp%.json
echo   - Schedule daily: Use Windows Task Scheduler with "backup.bat auto"
echo.
pause