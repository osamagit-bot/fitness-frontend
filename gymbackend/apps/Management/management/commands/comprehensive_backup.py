import os
import json
import gzip
import hashlib
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create comprehensive backup with all models - enhanced with compression and integrity checking'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output-dir',
            type=str,
            default='backups',
            help='Directory to store backup files'
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            help='Compress backup file with gzip'
        )
        parser.add_argument(
            '--cleanup-old',
            type=int,
            default=30,
            help='Delete backups older than X days (0 to disable)'
        )

    def handle(self, *args, **options):
        try:
            # Create backup directory
            backup_dir = options['output_dir']
            os.makedirs(backup_dir, exist_ok=True)
            
            # Clean up old backups if requested
            if options['cleanup_old'] > 0:
                self.cleanup_old_backups(backup_dir, options['cleanup_old'])
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_ext = '.json.gz' if options['compress'] else '.json'
            backup_file = os.path.join(backup_dir, f'comprehensive_backup_{timestamp}{file_ext}')
            
            self.stdout.write('Creating comprehensive backup...')
            
            # Get all data in transaction for consistency
            with transaction.atomic():
                all_data = self.get_all_data()
            
            # Convert to JSON string first
            json_data = json.dumps(all_data, indent=2, ensure_ascii=False, default=str)
            
            # Save backup (compressed or uncompressed)
            if options['compress']:
                with gzip.open(backup_file, 'wt', encoding='utf-8') as f:
                    f.write(json_data)
            else:
                with open(backup_file, 'w', encoding='utf-8') as f:
                    f.write(json_data)
            
            # Generate integrity checksum
            checksum = self.generate_checksum(backup_file, options['compress'])
            checksum_file = backup_file + '.md5'
            with open(checksum_file, 'w') as f:
                f.write(f'{checksum}  {os.path.basename(backup_file)}\n')
            
            file_size = os.path.getsize(backup_file)
            size_kb = round(file_size / 1024, 2)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Comprehensive backup created!\n'
                    f'File: {backup_file}\n'
                    f'Records: {len(all_data)}\n'
                    f'Size: {size_kb} KB\n'
                    f'Checksum: {checksum[:16]}...\n'
                    f'Compressed: {"Yes" if options["compress"] else "No"}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Comprehensive backup failed: {str(e)}')
            )
            logger.error(f'Comprehensive backup failed: {str(e)}')
            raise

    def get_all_data(self):
        """Get all data from all models"""
        all_data = []
        
        # Get all models dynamically to ensure complete backup
        all_models = []
        for app_config in apps.get_app_configs():
            if app_config.name.startswith('apps.'):
                for model in app_config.get_models():
                    all_models.append((app_config.label, model.__name__))
        
        # Sort models by dependency order (basic ordering)
        models_to_backup = [
            ('Authentication', 'CustomUser'),
            ('Member', 'Member'),
            ('Member', 'MembershipPayment'), 
            ('Member', 'Trainer'),
            ('Member', 'Training'),
            ('Purchase', 'Product'),
            ('Purchase', 'Purchase'),
            ('Stock', 'StockIn'),
            ('Stock', 'StockOut'),
            ('Stock', 'PermanentlyDeletedSale'),
            ('Stock', 'SalesSummarySnapshot'),
            ('Attendance', 'Attendance'),
            ('Notifications', 'Notification'),
            ('Community', 'Post'),
            ('Community', 'Comment'),
            ('Community', 'Announcement'),
            ('Community', 'Challenge'),
            ('Community', 'ChallengeParticipant'),
            ('Community', 'SupportTicket'),
            ('Community', 'TicketResponse'),
            ('Community', 'FAQCategory'),
            ('Community', 'FAQ'),
            ('Management', 'SiteSettings'),
        ]
        
        # Add any models not in the predefined list
        predefined_models = {f'{app}.{model}' for app, model in models_to_backup}
        for app_label, model_name in all_models:
            model_key = f'{app_label}.{model_name}'
            if model_key not in predefined_models:
                models_to_backup.append((app_label, model_name))
                self.stdout.write(f'Added discovered model: {app_label}.{model_name}')
        
        self.stdout.write(f'Total models to backup: {len(models_to_backup)}')
        
        for app_label, model_name in models_to_backup:
            try:
                model_class = apps.get_model(app_label, model_name)
                objects = model_class.objects.all()
                
                if objects.exists():
                    serialized_data = serializers.serialize(
                        'json',
                        objects,
                        use_natural_foreign_keys=False,  # Use PKs for reliability
                        use_natural_primary_keys=False
                    )
                    
                    model_data = json.loads(serialized_data)
                    all_data.extend(model_data)
                    
                    self.stdout.write(f'Backed up {len(model_data)} {app_label}.{model_name} records')
                else:
                    self.stdout.write(f'No data found for {app_label}.{model_name}')
                
            except Exception as e:
                self.stdout.write(f'Skipping {app_label}.{model_name}: {str(e)}')
                continue
        
        return all_data

    def cleanup_old_backups(self, backup_dir, days_to_keep):
        """Remove backup files older than specified days"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        removed_count = 0
        
        for filename in os.listdir(backup_dir):
            if filename.startswith('comprehensive_backup_') and (filename.endswith('.json') or filename.endswith('.json.gz')):
                filepath = os.path.join(backup_dir, filename)
                file_time = datetime.fromtimestamp(os.path.getctime(filepath))
                
                if file_time < cutoff_date:
                    try:
                        os.remove(filepath)
                        # Also remove checksum file if exists
                        checksum_file = filepath + '.md5'
                        if os.path.exists(checksum_file):
                            os.remove(checksum_file)
                        removed_count += 1
                        self.stdout.write(f'Removed old backup: {filename}')
                    except Exception as e:
                        self.stdout.write(f'Could not remove {filename}: {str(e)}')
        
        if removed_count > 0:
            self.stdout.write(f'Cleaned up {removed_count} old backup files')

    def generate_checksum(self, filepath, is_compressed):
        """Generate MD5 checksum for backup integrity verification"""
        hash_md5 = hashlib.md5()
        
        if is_compressed:
            with gzip.open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
        else:
            with open(filepath, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
        
        return hash_md5.hexdigest()