import os
import json
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create incremental backup (only changed data since last backup)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--since',
            type=str,
            help='Date since when to backup (YYYY-MM-DD format)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='backups',
            help='Directory to store backup files'
        )

    def handle(self, *args, **options):
        try:
            # Create backup directory
            backup_dir = options['output_dir']
            os.makedirs(backup_dir, exist_ok=True)
            
            # Determine since date
            since_date = self.get_since_date(options.get('since'))
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = os.path.join(backup_dir, f'incremental_backup_{timestamp}.json')
            
            self.stdout.write(f'🔄 Creating incremental backup since {since_date}...')
            
            # Get changed data
            changed_data = self.get_changed_data(since_date)
            
            # Save backup
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(changed_data, f, indent=2, ensure_ascii=False, default=str)
            
            # Update last backup timestamp
            self.update_last_backup_timestamp()
            
            file_size = os.path.getsize(backup_file)
            size_kb = round(file_size / 1024, 2)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Incremental backup created!\n'
                    f'📁 File: {backup_file}\n'
                    f'📊 Records: {len(changed_data)}\n'
                    f'💾 Size: {size_kb} KB'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Incremental backup failed: {str(e)}')
            )
            logger.error(f'Incremental backup failed: {str(e)}')
            raise

    def get_since_date(self, since_str):
        """Get the date since when to backup"""
        if since_str:
            return datetime.strptime(since_str, '%Y-%m-%d')
        
        # Try to get last backup timestamp
        timestamp_file = 'backups/.last_backup'
        if os.path.exists(timestamp_file):
            with open(timestamp_file, 'r') as f:
                return datetime.fromisoformat(f.read().strip())
        
        # Default to 24 hours ago
        return datetime.now() - timedelta(days=1)

    def get_changed_data(self, since_date):
        """Get all data changed since the given date"""
        changed_data = []
        
        # Models with timestamp fields to check
        models_to_check = [
            ('Authentication', 'CustomUser', 'date_joined'),
            ('Member', 'Member', None),  # No timestamp field
            ('Member', 'MembershipPayment', 'paid_on'),
            ('Member', 'Trainer', 'created_at'),
            ('Member', 'Training', 'created_at'),
            ('Attendance', 'Attendance', 'check_in_time'),
            ('Community', 'Post', 'date_created'),
            ('Community', 'Comment', 'date_created'),
            ('Community', 'Announcement', 'date_created'),
            ('Community', 'Challenge', 'date_created'),
            ('Community', 'SupportTicket', 'date_created'),
            ('Notifications', 'Notification', 'created_at'),
            ('Purchase', 'Purchase', 'date'),
            ('Purchase', 'Product', 'created_at'),
        ]
        
        for app_label, model_name, timestamp_field in models_to_check:
            try:
                model_class = apps.get_model(app_label, model_name)
                
                if timestamp_field:
                    # Filter by timestamp
                    filter_kwargs = {f'{timestamp_field}__gte': since_date}
                    objects = model_class.objects.filter(**filter_kwargs)
                else:
                    # For models without timestamp, get all (like Member)
                    objects = model_class.objects.all()
                
                if objects.exists():
                    serialized_data = serializers.serialize(
                        'json',
                        objects,
                        use_natural_foreign_keys=True,
                        use_natural_primary_keys=True
                    )
                    
                    model_data = json.loads(serialized_data)
                    changed_data.extend(model_data)
                    
                    self.stdout.write(f'✅ Found {len(model_data)} changed {model_name} records')
                
            except Exception as e:
                self.stdout.write(f'⚠️ Skipping {app_label}.{model_name}: {str(e)}')
                continue
        
        return changed_data

    def update_last_backup_timestamp(self):
        """Update the last backup timestamp"""
        timestamp_file = 'backups/.last_backup'
        os.makedirs('backups', exist_ok=True)
        
        with open(timestamp_file, 'w') as f:
            f.write(datetime.now().isoformat())