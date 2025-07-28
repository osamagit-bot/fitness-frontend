# 🗄️ Gym Management System - Backup & Restore Guide

## 📋 Quick Start

### Create Backup
```bash
# RECOMMENDED: Complete backup with all data
python manage.py comprehensive_backup

# Enhanced backup with media files
python manage.py backup_db --include-media --compress

# Full encrypted backup with cloud upload
python manage.py backup_db --include-media --compress --encrypt --upload-cloud

# Incremental backup (only changes)
python manage.py incremental_backup

# Quick batch script
.\backup_system\backup.bat
```

### Restore Database
```bash
# Restore from backup
python manage.py restore_db backups\gym_backup_20250723_235959.zip --confirm

# Restore encrypted backup
python manage.py restore_db backups\gym_backup_20250723_235959.zip.encrypted --confirm --encryption-key-file backups\gym_backup_20250723_235959.zip.key

# Restore with media files
python manage.py restore_db backups\gym_backup_20250723_235959.zip --confirm --restore-media
```

### Check Backup Status
```bash
# Monitor backup health
python manage.py backup_status
```

## 🏗️ System Architecture

### What Gets Backed Up
✅ **Always Included:**
- User accounts and profiles (CustomUser)
- Member registrations and payments
- Trainer information and schedules
- Attendance records
- Purchase history and products
- Community posts, comments, announcements
- Notifications and support tickets
- Training sessions and challenges
- Site settings and configurations
- WebAuthn credentials

📁 **Optionally Included:**
- Media files (product images, trainer photos, training images)
- Static files (with --include-static flag)

❌ **Always Excluded:**
- Session data (temporary)
- Admin logs (regenerated)
- Content types (Django internal)
- Permissions (Django internal)
- Cache data
- Log files

🔐 **Security Features:**
- Encryption support with Fernet
- Secure key storage
- Cloud upload to AWS S3
- Compressed archives

### File Structure
```
gymbackend/
├── backup_system/      # Centralized backup system
│   ├── commands/       # Django management commands
│   ├── backup.bat      # Main backup script
│   ├── backup.ps1      # PowerShell version
│   ├── restore.bat     # Restore script
│   ├── backup_config.py # Configuration
│   └── BACKUP_SYSTEM_GUIDE.md
├── backups/            # Backup storage directory
├── backup.bat          # Redirect to backup_system
└── restore.bat         # Redirect to backup_system
```

## 🚀 Production Deployment

### 1. Manual Backups
```bash
# Create backup before major changes
.\backup.bat

# Verify backup
python -c "import json; data=json.load(open('backups/gym_backup_latest.json')); print(f'Records: {len(data)}')"
```

### 2. Automated Daily Backups

#### Windows Task Scheduler
1. Open **Task Scheduler**
2. Create Basic Task
3. **Name**: "Gym Database Daily Backup"
4. **Trigger**: Daily at 2:00 AM
5. **Action**: Start a program
6. **Program**: `C:\path\to\gymbackend\backup.bat`
7. **Arguments**: `auto`
8. **Start in**: `C:\path\to\gymbackend`

#### Linux Cron Job
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/gymbackend && ./backup.sh auto
```

### 3. Production Environment Variables
```bash
# .env.production
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=True
BACKUP_ENCRYPTION=True
BACKUP_CLOUD_SYNC=True
```

## 🔧 Development Usage

### Development Workflow
```bash
# 1. Create backup before testing
.\backup.bat

# 2. Test your changes
python manage.py runserver

# 3. If something breaks, restore
.\restore.bat backups\gym_backup_20250723_235959.json

# 4. Continue development
```

### Testing Data Reset
```bash
# Create test data backup
.\backup.bat

# Reset to clean state when needed
.\restore.bat backups\gym_backup_clean_testdata.json
```

## 🛡️ Security & Best Practices

### Backup Security
- ✅ Store backups in secure location
- ✅ Regular backup verification
- ✅ Offsite backup copies
- ✅ Access control on backup files
- ✅ Encryption for sensitive data

### Retention Policy
- **Development**: Keep 7 days
- **Production**: Keep 30 days
- **Monthly**: Archive important milestones
- **Annual**: Long-term storage

### Verification Checklist
- [ ] Backup file is valid JSON
- [ ] Contains expected record count
- [ ] File size is reasonable
- [ ] Restore test successful
- [ ] No sensitive data exposed

## 🚨 Troubleshooting

### Common Issues

#### 1. "Invalid JSON format"
```bash
# Problem: Backup contains debug output
# Solution: Use clean backup scripts
powershell -ExecutionPolicy Bypass -File backup.ps1
```

#### 2. "Backup file corrupted"
```bash
# Check file content
powershell "Get-Content backups\gym_backup_latest.json | Select-Object -First 5"

# Should start with: [
# If it starts with debug text, recreate backup
```

#### 3. "Restore failed"
```bash
# Verify backup first
python -c "import json; json.load(open('backups/your_backup.json'))"

# Check Django migrations
python manage.py showmigrations

# Apply missing migrations
python manage.py migrate
```

#### 4. "Permission denied"
```bash
# Windows: Run as Administrator
# Linux: Check file permissions
chmod +x backup.sh restore.sh
```

### Recovery Procedures

#### Emergency Restore
```bash
# 1. Stop application
# 2. Create emergency backup of current state
.\backup.bat

# 3. Restore from last known good backup
.\restore.bat backups\gym_backup_last_good.json

# 4. Verify data integrity
python manage.py check

# 5. Restart application
```

#### Data Corruption Recovery
```bash
# 1. Identify corruption scope
# 2. Find last clean backup
# 3. Restore clean backup
# 4. Manually re-enter recent data if needed
# 5. Implement additional validation
```

## 📊 Monitoring & Alerts

### Backup Monitoring
```bash
# Check backup status
dir backups\gym_backup_*.json

# Verify latest backup
python -c "
import json, os
files = [f for f in os.listdir('backups') if f.startswith('gym_backup_')]
if files:
    latest = max(files)
    data = json.load(open(f'backups/{latest}'))
    print(f'Latest: {latest}, Records: {len(data)}')
else:
    print('No backups found!')
"
```

### Health Checks
- Daily backup creation
- Backup file integrity
- Storage space availability
- Restore test (weekly)

## 🎯 Performance Optimization

### Large Database Tips
```bash
# Compress backups
python manage.py dumpdata --natural-foreign --natural-primary --indent=0 | gzip > backup.json.gz

# Exclude large tables if needed
python manage.py dumpdata --exclude=large_table_app.LargeModel

# Parallel processing for large datasets
# Use database-specific tools for very large databases
```

### Storage Management
- Automatic cleanup of old backups
- Compression for archived backups
- Cloud storage integration
- Monitoring disk space usage

---

## 📞 Support

### Quick Commands Reference
```bash
# Create enhanced backup
python manage.py backup_db --include-media --compress

# Create encrypted backup
python manage.py backup_db --include-media --encrypt

# Incremental backup
python manage.py incremental_backup

# Check backup status
python manage.py backup_status

# List all backups
dir backups\gym_backup_*.*

# Restore backup
python manage.py restore_db backups\gym_backup_YYYYMMDD_HHMMSS.zip --confirm

# Restore with media
python manage.py restore_db backups\gym_backup_YYYYMMDD_HHMMSS.zip --confirm --restore-media

# Clean old backups
forfiles /p backups /s /m gym_backup_*.* /d -7 /c "cmd /c del @path"
```

### Installation
```bash
# Install additional dependencies
pip install -r backup_system/backup_requirements.txt

# Add settings from backup_system/backup_config.py to your settings.py

# Test the system
python manage.py backup_status
```

### Emergency Contacts
- **System Administrator**: [Your contact]
- **Database Administrator**: [Your contact]
- **Development Team**: [Your contact]

---

**✅ Your backup system is now production-ready with comprehensive documentation!**