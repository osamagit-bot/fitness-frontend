import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Create a database backup'

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
            help='Compress the backup file'
        )

    def handle(self, *args, **options):
        try:
            # Create backup directory if it doesn't exist
            backup_dir = options['output_dir']
            os.makedirs(backup_dir, exist_ok=True)
            
            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'gym_backup_{timestamp}.sql'
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # Get database settings
            db_settings = settings.DATABASES['default']
            
            if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
                self.backup_sqlite(db_settings, backup_path)
            elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
                self.backup_postgresql(db_settings, backup_path, options['compress'])
            elif db_settings['ENGINE'] == 'django.db.backends.mysql':
                self.backup_mysql(db_settings, backup_path, options['compress'])
            else:
                self.stdout.write(
                    self.style.ERROR(f'Unsupported database engine: {db_settings["ENGINE"]}')
                )
                return
            
            # Verify backup was created
            if os.path.exists(backup_path):
                file_size = os.path.getsize(backup_path)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Backup created successfully: {backup_path} ({file_size} bytes)'
                    )
                )
                logger.info(f'Database backup created: {backup_path}')
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Backup file was not created')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Backup failed: {str(e)}')
            )
            logger.error(f'Database backup failed: {str(e)}')

    def backup_sqlite(self, db_settings, backup_path):
        """Backup SQLite database"""
        import shutil
        db_path = db_settings['NAME']
        shutil.copy2(db_path, backup_path)
        self.stdout.write(f'📁 SQLite database copied to {backup_path}')

    def backup_postgresql(self, db_settings, backup_path, compress=False):
        """Backup PostgreSQL database"""
        cmd = [
            'pg_dump',
            f'--host={db_settings["HOST"]}',
            f'--port={db_settings["PORT"]}',
            f'--username={db_settings["USER"]}',
            f'--dbname={db_settings["NAME"]}',
            '--no-password',
            f'--file={backup_path}'
        ]
        
        if compress:
            cmd.append('--compress=9')
            backup_path += '.gz'
        
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f'pg_dump failed: {result.stderr}')
        
        self.stdout.write(f'🐘 PostgreSQL database backed up to {backup_path}')

    def backup_mysql(self, db_settings, backup_path, compress=False):
        """Backup MySQL database"""
        cmd = [
            'mysqldump',
            f'--host={db_settings["HOST"]}',
            f'--port={str(db_settings["PORT"])}',
            f'--user={db_settings["USER"]}',
            f'--password={db_settings["PASSWORD"]}',
            '--single-transaction',
            '--routines',
            '--triggers',
            db_settings['NAME']
        ]
        
        with open(backup_path, 'w') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        
        if result.returncode != 0:
            raise Exception(f'mysqldump failed: {result.stderr}')
        
        if compress:
            import gzip
            with open(backup_path, 'rb') as f_in:
                with gzip.open(f'{backup_path}.gz', 'wb') as f_out:
                    f_out.writelines(f_in)
            os.remove(backup_path)
            backup_path += '.gz'
        
        self.stdout.write(f'🐬 MySQL database backed up to {backup_path}')