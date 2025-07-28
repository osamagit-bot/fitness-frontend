@echo off
echo 🧹 Cleaning up old backup files...

:: Remove old backup files with debug output
if exist "backups\gym_clean_backup_*.json" (
    echo Removing old clean_backup files...
    del "backups\gym_clean_backup_*.json"
)

if exist "backups\gym_full_backup_*.json" (
    echo Removing old full_backup files...
    del "backups\gym_full_backup_*.json"
)

if exist "backups\*_cleaned.json" (
    echo Removing old cleaned files...
    del "backups\*_cleaned.json"
)

if exist "backups\*~*" (
    echo Removing temporary files...
    del "backups\*~*"
)

echo ✅ Cleanup completed!
echo.
echo Current backup files:
dir /b backups\gym_backup_*.json 2>nul || echo No backup files found

pause