# 🗄️ Centralized Backup System

All backup-related files are now organized in this directory.

## 📁 Directory Structure
```
backup_system/
├── commands/           # Django management commands
│   ├── backup_db.py           # Main backup command
│   ├── restore_db.py          # Main restore command
│   ├── backup_status.py       # Backup monitoring
│   └── incremental_backup.py  # Incremental backups
├── backup.bat         # Windows backup script
├── backup.ps1         # PowerShell backup script
├── restore.bat        # Windows restore script
├── cleanup_old_backups.bat    # Cleanup utility
├── backup_config.py   # Configuration settings
├── backup_requirements.txt    # Dependencies
├── BACKUP_SYSTEM_GUIDE.md     # Complete documentation
└── README.md          # This file
```

## 🚀 Quick Start
```bash
# From project root
.\backup.bat

# Or directly
.\backup_system\backup.bat

# Django commands still work
python manage.py backup_db --help
```

## 📋 Installation
1. Install dependencies: `pip install -r backup_system/backup_requirements.txt`
2. Add settings from `backup_system/backup_config.py` to your `settings.py`
3. Run: `python manage.py backup_status`

## 📖 Documentation
See `BACKUP_SYSTEM_GUIDE.md` for complete documentation.