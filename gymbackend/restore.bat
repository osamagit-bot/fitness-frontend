@echo off
:: Main restore script using Django management command
echo 🔄 Available restore commands:
echo   - comprehensive_restore [backup_file] --confirm
echo   - restore_json [backup_file]
echo   - simple_restore [backup_file]
echo.
echo Example: python manage.py comprehensive_restore backups\backup_file.json --confirm
echo.
call venv311\Scripts\activate.bat
cmd /k