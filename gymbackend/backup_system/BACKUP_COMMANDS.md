# 🗄️ Backup System Commands

## 📋 **Recommended Commands**

### **For Regular Backups (RECOMMENDED):**
```bash
# Complete backup with all data including media files
python manage.py comprehensive_backup

# Or use the enhanced backup with media and compression
python manage.py backup_db --include-media --compress
```

### **For Restore:**
```bash
# Restore from comprehensive backup
python manage.py restore_db backups/comprehensive_backup_YYYYMMDD_HHMMSS.json --confirm

# Restore with media files (if backup includes them)
python manage.py restore_db backups/gym_backup_YYYYMMDD_HHMMSS.zip --confirm --restore-media
```

### **For Quick Incremental Backups:**
```bash
# Only backup changes since last backup
python manage.py incremental_backup
```

### **For Monitoring:**
```bash
# Check backup system health
python manage.py backup_status
```

## 🎯 **Best Practices**

### **Daily Backup Routine:**
1. **Morning**: `python manage.py comprehensive_backup`
2. **Evening**: `python manage.py incremental_backup`

### **Before Major Changes:**
```bash
python manage.py comprehensive_backup --output-dir=backups/pre-update
```

### **Production Backup:**
```bash
python manage.py backup_db --include-media --compress --encrypt --upload-cloud
```

## 📁 **What Gets Backed Up**

### **comprehensive_backup** (RECOMMENDED):
- ✅ All user accounts and authentication data
- ✅ All member records and payments
- ✅ All trainer and training data
- ✅ All products and purchases
- ✅ All attendance records
- ✅ All community posts and comments
- ✅ All notifications
- ✅ All site settings

### **backup_db --include-media**:
- ✅ Everything above PLUS
- ✅ Product images
- ✅ Trainer photos
- ✅ Training images

## ⚠️ **Important Notes**

- Always use `--confirm` flag for restore operations
- Keep encryption keys safe if using `--encrypt`
- Test restore process regularly
- Store backups in multiple locations

## 🔧 **Utility Commands**
```bash
# Fix missing member records (if needed)
python manage.py fix_members_direct

# Clean old backups
python manage.py cleanup_old_backups
```