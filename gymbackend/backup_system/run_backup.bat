@echo off
echo Running comprehensive backup...
cd /d "%~dp0.."
python -c "import sys, os; sys.path.insert(0, 'backup_system/commands'); from comprehensive_backup import Command; Command().handle()"
echo Backup completed!