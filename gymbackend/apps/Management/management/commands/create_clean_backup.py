import os
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps

class Command(BaseCommand):
    help = 'Create a clean backup with proper dependency handling'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            help='Output file path (optional)'
        )

    def handle(self, *args, **options):
        try:
            # Generate timestamp for filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if options['output']:
                backup_file = options['output']
            else:
                os.makedirs('backups', exist_ok=True)
                backup_file = f'backups/clean_backup_{timestamp}.json'
            
            self.stdout.write('🔄 Creating clean backup...')
            
            # Define models to backup in dependency order
            models_to_backup = [
                'Authentication.CustomUser',
                'Member.Member', 
                'Trainer.Trainer',
                'Notifications.Notification',
                'Community.Post',
                'Community.Comment',
            ]
            
            all_data = []
            
            for model_name in models_to_backup:
                try:
                    app_label, model_class_name = model_name.split('.')
                    model_class = apps.get_model(app_label, model_class_name)
                    
                    # Get all objects for this model
                    objects = model_class.objects.all()
                    
                    if objects.exists():
                        # Serialize objects
                        serialized_data = serializers.serialize(
                            'json', 
                            objects,
                            use_natural_foreign_keys=True,
                            use_natural_primary_keys=True
                        )
                        
                        # Parse and add to all_data
                        model_data = json.loads(serialized_data)
                        all_data.extend(model_data)
                        
                        self.stdout.write(f'✅ Backed up {len(model_data)} {model_name} records')
                    
                except Exception as e:
                    self.stdout.write(f'⚠️ Skipping {model_name}: {str(e)}')
                    continue
            
            # Write backup file
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False)
            
            # Get file size
            file_size = os.path.getsize(backup_file)
            size_kb = round(file_size / 1024, 2)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Clean backup created successfully!\n'
                    f'📁 File: {backup_file}\n'
                    f'📊 Records: {len(all_data)}\n'
                    f'💾 Size: {size_kb} KB'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Backup failed: {str(e)}')
            )
            raise