@echo off
:: Main backup script using Django management command
echo 🔄 Creating comprehensive backup...
call venv311\Scripts\activate.bat
python manage.py comprehensive_backup --output-dir backups
pause