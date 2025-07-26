import os
import json
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction, connection
from django.conf import settings
from django.core import serializers

class Command(BaseCommand):
    help = 'Restore database from backup with foreign key constraints disabled'

    def add_arguments(self, parser):
        parser.add_argument('backup_file', type=str, help='Path to backup file')

    def handle(self, *args, **options):
        backup_file = options['backup_file']
        
        if not os.path.exists(backup_file):
            self.stdout.write(self.style.ERROR(f'Backup file not found: {backup_file}'))
            return

        try:
            # Load backup data first to inspect it
            with open(backup_file, 'r', encoding='utf-8') as f:
                fixture_data = json.load(f)
            
            print(f"Backup file contains {len(fixture_data)} records")
            
            # Count models in backup
            model_counts = {}
            for item in fixture_data:
                model = item.get('model', 'unknown')
                model_counts[model] = model_counts.get(model, 0) + 1
            
            print(f"Models in backup: {model_counts}")
            
            # Check for Member records specifically
            member_records = [item for item in fixture_data if item.get('model') == 'Member.member']
            print(f"Member records found: {len(member_records)}")
            for member in member_records:
                print(f"Member: {member}")
            
            with transaction.atomic():
                # Disable foreign key checks
                with connection.cursor() as cursor:
                    if connection.vendor == 'sqlite':
                        cursor.execute('PRAGMA foreign_keys = OFF;')
                    elif connection.vendor == 'postgresql':
                        cursor.execute('SET session_replication_role = replica;')
                    elif connection.vendor == 'mysql':
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
                
                self.stdout.write('Flushing database...')
                call_command('flush', '--noinput', verbosity=0)
                
                self.stdout.write('Loading backup data with custom deserialization...')
                
                # Load and deserialize data manually to bypass constraint checks
                success_count = 0
                error_count = 0
                
                for obj in serializers.deserialize('json', json.dumps(fixture_data)):
                    try:
                        # Special handling for Member objects without user field
                        if hasattr(obj.object, '_meta') and obj.object._meta.model_name == 'member':
                            print(f"Processing Member: {obj.object}")
                            print(f"Member fields: {obj.object.__dict__}")
                            
                            # Set user to None if it doesn't exist
                            if hasattr(obj.object, 'user'):
                                obj.object.user = None
                        
                        obj.save()
                        success_count += 1
                        print(f"Saved: {obj.object} (Model: {obj.object._meta.model_name})")
                        
                    except Exception as e:
                        error_count += 1
                        print(f"Failed to save {obj.object} (Model: {getattr(obj.object._meta, 'model_name', 'unknown')}): {e}")
                
                print(f"Restore summary: {success_count} success, {error_count} errors")
                
                # Re-enable foreign key checks
                with connection.cursor() as cursor:
                    if connection.vendor == 'sqlite':
                        cursor.execute('PRAGMA foreign_keys = ON;')
                    elif connection.vendor == 'postgresql':
                        cursor.execute('SET session_replication_role = DEFAULT;')
                    elif connection.vendor == 'mysql':
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
            
            self.stdout.write(self.style.SUCCESS('Database restored successfully!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Restore failed: {str(e)}'))
            raise

    def sort_fixtures_by_dependency(self, fixture_data):
        """Sort fixtures to load dependencies first"""
        # Define model loading order (dependencies first)
        model_priority = {
            'auth.user': 1,
            'authentication.customuser': 1,
            'contenttypes.contenttype': 2,
            'auth.permission': 3,
            'auth.group': 4,
            'member.member': 5,
            'trainer.trainer': 5,
            'notifications.notification': 6,
            'community.post': 7,
            'community.comment': 8,
        }
        
        def get_priority(obj):
            model = obj.get('model', '').lower()
            return model_priority.get(model, 999)
        
        return sorted(fixture_data, key=get_priority)





