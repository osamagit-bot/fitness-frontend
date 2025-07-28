# Backup System Configuration
# Add these settings to your Django settings.py file

# AWS S3 Configuration for Cloud Backups
AWS_ACCESS_KEY_ID = 'your-aws-access-key'
AWS_SECRET_ACCESS_KEY = 'your-aws-secret-key'
BACKUP_S3_BUCKET = 'your-backup-bucket-name'
AWS_S3_REGION_NAME = 'us-east-1'

# Backup Settings
BACKUP_RETENTION_DAYS = 30  # Keep backups for 30 days
BACKUP_COMPRESSION = True   # Compress backups by default
BACKUP_ENCRYPTION = False   # Encrypt backups by default
BACKUP_INCLUDE_MEDIA = True # Include media files by default

# Email Notifications for Backup Status
BACKUP_EMAIL_NOTIFICATIONS = True
BACKUP_EMAIL_RECIPIENTS = ['admin@yourgym.com']

# Backup Schedule (for automated backups)
BACKUP_SCHEDULE = {
    'daily': True,
    'time': '02:00',  # 2 AM
    'incremental_frequency': 6,  # Hours between incremental backups
}

# Security Settings
BACKUP_ENCRYPTION_KEY_STORAGE = 'local'  # 'local' or 'aws_secrets'
BACKUP_MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1GB max backup size

# Monitoring
BACKUP_HEALTH_CHECK_URL = None  # Optional webhook for monitoring
BACKUP_SLACK_WEBHOOK = None     # Optional Slack notifications