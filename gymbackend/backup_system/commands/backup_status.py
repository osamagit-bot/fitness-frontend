import os
import json
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Check backup system status and health'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Backup System Status Report')
        self.stdout.write('=' * 40)
        
        # Check backup directory
        backup_dir = 'backups'
        if not os.path.exists(backup_dir):
            self.stdout.write(self.style.ERROR('❌ Backup directory not found'))
            return
        
        # Get all backup files
        backup_files = []
        for file in os.listdir(backup_dir):
            if file.startswith('gym_backup_'):
                file_path = os.path.join(backup_dir, file)
                file_stat = os.stat(file_path)
                backup_files.append({
                    'name': file,
                    'path': file_path,
                    'size': file_stat.st_size,
                    'modified': datetime.fromtimestamp(file_stat.st_mtime)
                })
        
        backup_files.sort(key=lambda x: x['modified'], reverse=True)
        
        # Display statistics
        self.stdout.write(f'📊 Total backups: {len(backup_files)}')
        
        if backup_files:
            latest = backup_files[0]
            self.stdout.write(f'📅 Latest backup: {latest["name"]}')
            self.stdout.write(f'🕐 Created: {latest["modified"].strftime("%Y-%m-%d %H:%M:%S")}')
            self.stdout.write(f'💾 Size: {self.format_size(latest["size"])}')
            
            # Check if backup is recent (within 24 hours)
            if latest['modified'] > datetime.now() - timedelta(hours=24):
                self.stdout.write('✅ Recent backup available')
            else:
                self.stdout.write('⚠️ No recent backup (older than 24 hours)')
        else:
            self.stdout.write('❌ No backups found')
        
        # Check disk space
        total_size = sum(f['size'] for f in backup_files)
        self.stdout.write(f'💽 Total backup size: {self.format_size(total_size)}')
        
        # Check for old backups
        old_backups = [f for f in backup_files if f['modified'] < datetime.now() - timedelta(days=30)]
        if old_backups:
            self.stdout.write(f'🗑️ Old backups (>30 days): {len(old_backups)}')
        
        # Check backup types
        encrypted_count = len([f for f in backup_files if f['name'].endswith('.encrypted')])
        compressed_count = len([f for f in backup_files if f['name'].endswith('.zip')])
        
        self.stdout.write(f'🔐 Encrypted backups: {encrypted_count}')
        self.stdout.write(f'📦 Compressed backups: {compressed_count}')
        
        # Check last incremental backup
        timestamp_file = os.path.join(backup_dir, '.last_backup')
        if os.path.exists(timestamp_file):
            with open(timestamp_file, 'r') as f:
                last_incremental = datetime.fromisoformat(f.read().strip())
            self.stdout.write(f'⚡ Last incremental: {last_incremental.strftime("%Y-%m-%d %H:%M:%S")}')
        
        # Health recommendations
        self.stdout.write('\n💡 Recommendations:')
        
        if not backup_files:
            self.stdout.write('  - Create your first backup: python manage.py backup_db')
        elif len(backup_files) < 3:
            self.stdout.write('  - Create more regular backups for redundancy')
        
        if latest and latest['modified'] < datetime.now() - timedelta(hours=24):
            self.stdout.write('  - Create a fresh backup soon')
        
        if old_backups:
            self.stdout.write(f'  - Consider cleaning {len(old_backups)} old backups')
        
        if encrypted_count == 0:
            self.stdout.write('  - Consider using encryption for sensitive data')
    
    def format_size(self, size_bytes):
        """Format file size in human readable format"""
        if size_bytes < 1024:
            return f'{size_bytes} B'
        elif size_bytes < 1024 * 1024:
            return f'{size_bytes / 1024:.1f} KB'
        elif size_bytes < 1024 * 1024 * 1024:
            return f'{size_bytes / (1024 * 1024):.1f} MB'
        else:
            return f'{size_bytes / (1024 * 1024 * 1024):.1f} GB'