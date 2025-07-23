@echo off
:: =============================================================================
:: GYM MANAGEMENT SYSTEM - DATABASE RESTORE UTILITY
:: =============================================================================
:: Production & Development Ready
:: Safely restores database from clean JSON backups
:: =============================================================================

echo 🔄 Gym Database Restore Utility v2.0
echo ====================================

if "%1"=="" (
    echo Usage: restore.bat backup_file.json
    echo.
    echo 📁 Available backups:
    if exist "backups\gym_backup_*.json" (
        echo.
        for %%f in (backups\gym_backup_*.json) do (
            echo    %%f
        )
        echo.
    ) else (
        echo    No backup files found in backups\ directory
        echo    Run backup.bat first to create a backup
    )
    pause
    exit /b 1
)

if not exist "%1" (
    echo ❌ Backup file not found: %1
    echo.
    echo 💡 Make sure the file path is correct
    pause
    exit /b 1
)

:: Verify JSON format
echo 🔍 Verifying backup file...
python -c "import json; data=json.load(open('%1')); print(f'✅ Valid backup with {len(data)} records')" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Invalid backup file format
    echo 💡 File may be corrupted or contain debug output
    echo 💡 Try creating a new backup with: backup.bat
    pause
    exit /b 1
)

:: Safety confirmation
echo.
echo ⚠️  WARNING: DATABASE RESTORE OPERATION
echo ========================================
echo This will COMPLETELY REPLACE your current database!
echo.
echo 📁 Restoring from: %1
echo 🕐 Current time: %date% %time%
echo.
echo All current data will be lost and replaced with backup data.
echo Make sure you have a recent backup if you want to undo this.
echo.
set /p confirm="Type 'YES' to continue or anything else to cancel: "

if not "%confirm%"=="YES" (
    echo ❌ Restore operation cancelled
    echo ✅ Your database remains unchanged
    pause
    exit /b 0
)

echo.
echo 🗄️ Starting database restore...

:: Flush current database
echo 📤 Clearing current database...
python manage.py flush --noinput 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to clear database
    pause
    exit /b 1
)

:: Load backup data
echo 📥 Loading backup data...
python manage.py loaddata "%1" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to load backup data
    echo 💡 Database may be in inconsistent state
    echo 💡 Try running: python manage.py migrate
    pause
    exit /b 1
)

:: Run migrations to ensure consistency
echo 🔄 Applying database migrations...
python manage.py migrate 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Migration warnings (database should still work)
)

echo.
echo ✅ DATABASE RESTORE COMPLETED SUCCESSFULLY!
echo ==========================================
echo 📁 Restored from: %1
echo 🕐 Completed at: %date% %time%
echo.
echo Your database has been restored to the backup state.
echo You can now start your application normally.
echo.
pause