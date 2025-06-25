import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Backup MySQL database using mysqldump'

    def handle(self, *args, **options):
        db_settings = settings.DATABASES['default']
        db_name = db_settings.get('NAME')
        db_user = db_settings.get('USER')
        db_password = db_settings.get('PASSWORD')
        db_host = db_settings.get('HOST', 'localhost')
        db_port = db_settings.get('PORT', '3306')

        backup_dir = os.path.join(settings.BASE_DIR, 'db_backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_dir, f'{db_name}_backup_{timestamp}.sql')

        # Construct mysqldump command
        # On Windows, the mysqldump executable might not be in PATH, so specify full path or rely on environment
        command = [
            'mysqldump.exe',
            f'--user={db_user}',
            f'--password={db_password}',
            f'--host={db_host}',
            f'--port={db_port}',
            db_name,
        ]

        try:
            with open(backup_file, 'w') as f:
                subprocess.run(command, stdout=f, check=True)
            self.stdout.write(self.style.SUCCESS(f'Successfully backed up database to {backup_file}'))
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR('mysqldump executable not found. Please ensure it is installed and in your system PATH.'))
        except subprocess.CalledProcessError as e:
            self.stderr.write(self.style.ERROR(f'Error during backup: {e}'))
