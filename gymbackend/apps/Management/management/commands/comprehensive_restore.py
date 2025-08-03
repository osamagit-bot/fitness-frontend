import os
import json
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Restore comprehensive backup with all models including Stock and Sale data'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Path to backup JSON file'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm restoration (required)'
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.ERROR('Restoration requires --confirm flag')
            )
            return

        backup_file = options['backup_file']
        
        if not os.path.exists(backup_file):
            self.stdout.write(
                self.style.ERROR(f'Backup file not found: {backup_file}')
            )
            return

        try:
            self.stdout.write('Starting comprehensive restore...')
            
            # Load backup data
            with open(backup_file, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            self.stdout.write(f'Found {len(backup_data)} records to restore')
            
            # Group data by model
            model_data = {}
            for item in backup_data:
                model_key = item['model']
                if model_key not in model_data:
                    model_data[model_key] = []
                model_data[model_key].append(item)
            
            # Restore in dependency order
            # Get all models for clearing only
            restore_order = list(model_data.keys())
            
            with transaction.atomic():
                # Clear existing data (in reverse order)
                self.stdout.write('Clearing existing data...')
                for model_key in reversed(restore_order):
                    if model_key in model_data:
                        try:
                            app_label, model_name = model_key.split('.')
                            model_class = apps.get_model(app_label, model_name)
                            count = model_class.objects.count()
                            if count > 0:
                                model_class.objects.all().delete()
                                self.stdout.write(f'Cleared {count} {model_key} records')
                        except Exception as e:
                            self.stdout.write(f'Could not clear {model_key}: {str(e)}')
                
                # Use Django's loaddata to preserve exact backup data
                self.stdout.write('Restoring data using loaddata...')
                from django.core.management import call_command
                call_command('loaddata', backup_file)
                self.stdout.write(f'Restored all records from {backup_file}')
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Comprehensive restore completed!\n'
                    f'Data restored from: {backup_file}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Comprehensive restore failed: {str(e)}')
            )
            logger.error(f'Comprehensive restore failed: {str(e)}')
            raise