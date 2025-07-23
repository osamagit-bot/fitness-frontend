import os
import subprocess
from django.core.management.base import BaseCommand
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Restore database from backup'

    def add_arguments(self, parser):
        parser.add_argument(
            'backup_file',
            type=str,
            help='Path to backup file'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm database restoration (required)'
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.ERROR('❌ Database restoration requires --confirm flag')
            )
            return

        backup_file = options['backup_file']
        
        if not os.path.exists(backup_file):
            self.stdout.write(
                self.style.ERROR(f'❌ Backup file not found: {backup_file}')
            )
            return

        try:
            db_settings = settings.DATABASES['default']
            
            self.stdout.write(
                self.style.WARNING('⚠️ This will overwrite your current database!')
            )
            
            if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
                self.restore_sqlite(db_settings, backup_file)
            elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
                self.restore_postgresql(db_settings, backup_file)
            elif db_settings['ENGINE'] == 'django.db.backends.mysql':
                self.restore_mysql(db_settings, backup_file)
            else:
                self.stdout.write(
                    self.style.ERROR(f'Unsupported database engine: {db_settings["ENGINE"]}')
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS('✅ Database restored successfully!')
            )
            logger.info(f'Database restored from: {backup_file}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Restore failed: {str(e)}')
            )
            logger.error(f'Database restore failed: {str(e)}')

    def restore_sqlite(self, db_settings, backup_file):
        """Restore SQLite database"""
        import shutil
        db_path = db_settings['NAME']
        shutil.copy2(backup_file, db_path)
        self.stdout.write(f'📁 SQLite database restored from {backup_file}')

    def restore_postgresql(self, db_settings, backup_file):
        """Restore PostgreSQL database"""
        # Drop and recreate database
        cmd_drop = [
            'dropdb',
            f'--host={db_settings["HOST"]}',
            f'--port={db_settings["PORT"]}',
            f'--username={db_settings["USER"]}',
            '--if-exists',
            db_settings['NAME']
        ]
        
        cmd_create = [
            'createdb',
            f'--host={db_settings["HOST"]}',
            f'--port={db_settings["PORT"]}',
            f'--username={db_settings["USER"]}',
            db_settings['NAME']
        ]
        
        cmd_restore = [
            'psql',
            f'--host={db_settings["HOST"]}',
            f'--port={db_settings["PORT"]}',
            f'--username={db_settings["USER"]}',
            f'--dbname={db_settings["NAME"]}',
            f'--file={backup_file}'
        ]
        
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        # Execute commands
        subprocess.run(cmd_drop, env=env, check=True)
        subprocess.run(cmd_create, env=env, check=True)
        subprocess.run(cmd_restore, env=env, check=True)
        
        self.stdout.write(f'🐘 PostgreSQL database restored from {backup_file}')

    def restore_mysql(self, db_settings, backup_file):
        """Restore MySQL database"""
        cmd = [
            'mysql',
            f'--host={db_settings["HOST"]}',
            f'--port={str(db_settings["PORT"])}',
            f'--user={db_settings["USER"]}',
            f'--password={db_settings["PASSWORD"]}',
            db_settings['NAME']
        ]
        
        with open(backup_file, 'r') as f:
            result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, text=True)
        
        if result.returncode != 0:
            raise Exception(f'mysql restore failed: {result.stderr}')
        
        self.stdout.write(f'🐬 MySQL database restored from {backup_file}')