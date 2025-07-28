import os
import glob
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Clean up old backup files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete backups older than this many days (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        backup_dir = 'backups'
        if not os.path.exists(backup_dir):
            self.stdout.write('No backups directory found')
            return
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Find all backup files
        patterns = [
            'gym_backup_*.json',
            'gym_backup_*.zip',
            'comprehensive_backup_*.json',
            'incremental_backup_*.json',
            '*.encrypted',
            '*.key'
        ]
        
        deleted_count = 0
        total_size = 0
        
        for pattern in patterns:
            files = glob.glob(os.path.join(backup_dir, pattern))
            
            for file_path in files:
                file_stat = os.stat(file_path)
                file_date = datetime.fromtimestamp(file_stat.st_mtime)
                
                if file_date < cutoff_date:
                    file_size = file_stat.st_size
                    total_size += file_size
                    
                    if dry_run:
                        self.stdout.write(f'Would delete: {file_path} ({self.format_size(file_size)})')
                    else:
                        os.remove(file_path)
                        self.stdout.write(f'Deleted: {file_path} ({self.format_size(file_size)})')
                    
                    deleted_count += 1
        
        if dry_run:
            self.stdout.write(f'Would delete {deleted_count} files, freeing {self.format_size(total_size)}')
        else:
            self.stdout.write(f'Deleted {deleted_count} old backup files, freed {self.format_size(total_size)}')

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