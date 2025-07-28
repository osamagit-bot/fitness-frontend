@echo off
:: Main restore script - redirects to backup_system
echo 🔄 Redirecting to centralized backup system...
call backup_system\restore.bat %*