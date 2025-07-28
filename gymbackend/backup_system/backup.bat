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

echo 📦 Creating enhanced database backup...
echo    Type: %backup_type%
echo    Time: %timestamp%

:: Create enhanced backup with media files and compression
if "%backup_type%"=="auto" (
    python manage.py backup_db --output-dir=backups --include-media --compress 2>nul
) else (
    echo.
    echo Choose backup options:
    echo 1. Database only (fast)
    echo 2. Database + Media files
    echo 3. Database + Media + Encryption
    echo 4. Full backup with cloud upload
    echo.
    set /p choice="Enter choice (1-4): "
    
    if "!choice!"=="1" (
        python manage.py backup_db --output-dir=backups 2>nul
    ) else if "!choice!"=="2" (
        python manage.py backup_db --output-dir=backups --include-media --compress 2>nul
    ) else if "!choice!"=="3" (
        python manage.py backup_db --output-dir=backups --include-media --compress --encrypt 2>nul
    ) else if "!choice!"=="4" (
        python manage.py backup_db --output-dir=backups --include-media --compress --encrypt --upload-cloud 2>nul
    ) else (
        echo Invalid choice, using database only backup
        python manage.py backup_db --output-dir=backups 2>nul
    )
)

if %ERRORLEVEL% EQU 0 (
    echo ✅ Enhanced backup created successfully!
    
    :: Auto-cleanup old backups (keep last 7 days)
    if "%backup_type%"=="auto" (
        echo 🧹 Cleaning old backups...
        forfiles /p backups /s /m gym_backup_*.* /d -7 /c "cmd /c del @path" 2>nul
    )
    
    echo 📊 Current backups:
    dir /b backups\gym_backup_*.* 2>nul | find /c /v "" > temp_count.txt
    set /p backup_count=<temp_count.txt
    del temp_count.txt
    echo    Total: !backup_count! backup files
    
) else (
    echo ❌ Enhanced backup creation failed
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