import os
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.core import serializers
from django.apps import apps
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create comprehensive backup with all models'

    def add_arguments(self, parser):
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
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = os.path.join(backup_dir, f'comprehensive_backup_{timestamp}.json')
            
            self.stdout.write('🔄 Creating comprehensive backup...')
            
            # Get all data
            all_data = self.get_all_data()
            
            # Save backup
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False, default=str)
            
            file_size = os.path.getsize(backup_file)
            size_kb = round(file_size / 1024, 2)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Comprehensive backup created!\n'
                    f'📁 File: {backup_file}\n'
                    f'📊 Records: {len(all_data)}\n'
                    f'💾 Size: {size_kb} KB'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Comprehensive backup failed: {str(e)}')
            )
            logger.error(f'Comprehensive backup failed: {str(e)}')
            raise

    def get_all_data(self):
        """Get all data from all models"""
        all_data = []
        
        # Complete list of models in dependency order
        models_to_backup = [
            ('Authentication', 'CustomUser'),
            ('Member', 'Member'),
            ('Member', 'MembershipPayment'),
            ('Member', 'Trainer'),
            ('Member', 'Training'),
            ('Purchase', 'Product'),
            ('Purchase', 'Purchase'),
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
                    
                    self.stdout.write(f'✅ Backed up {len(model_data)} {app_label}.{model_name} records')
                else:
                    self.stdout.write(f'⚠️ No data found for {app_label}.{model_name}')
                
            except Exception as e:
                self.stdout.write(f'⚠️ Skipping {app_label}.{model_name}: {str(e)}')
                continue
        
        return all_data