import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction

class Command(BaseCommand):
    help = 'Restore database from JSON backup using Django loaddata'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Path to JSON backup file'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm database restoration (required)'
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.ERROR('Database restoration requires --confirm flag')
            )
            return

        backup_file = options['backup_file']
        
        if not os.path.exists(backup_file):
            self.stdout.write(
                self.style.ERROR(f'Backup file not found: {backup_file}')
            )
            return

        try:
            with transaction.atomic():
                # Clear existing data
                self.stdout.write('Clearing existing data...')
                call_command('flush', '--noinput')
                
                # Load backup data using Django's loaddata
                self.stdout.write('Loading backup data...')
                call_command('loaddata', backup_file)
                
                self.stdout.write(
                    self.style.SUCCESS('Database restored successfully!')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Restore failed: {str(e)}')
            )
            raise