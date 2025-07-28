import os
import subprocess
import shutil
import zipfile
from django.core.management.base import BaseCommand
from django.conf import settings
import logging
from cryptography.fernet import Fernet
from datetime import datetime

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
        parser.add_argument(
            '--encryption-key-file',
            type=str,
            help='Path to encryption key file (for encrypted backups)'
        )
        parser.add_argument(
            '--restore-media',
            action='store_true',
            help='Restore media files (if included in backup)'
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
            # Create temporary directory for extraction
            temp_dir = f'temp_restore_{int(datetime.now().timestamp())}'
            os.makedirs(temp_dir, exist_ok=True)
            
            try:
                # 1. Handle encrypted backup
                working_file = backup_file
                if backup_file.endswith('.encrypted'):
                    working_file = self.decrypt_backup(backup_file, options.get('encryption_key_file'), temp_dir)
                
                # 2. Extract backup if it's a ZIP
                db_file_path = working_file
                if working_file.endswith('.zip'):
                    db_file_path = self.extract_backup(working_file, temp_dir)
                
                # 3. Restore database
                self.stdout.write(
                    self.style.WARNING('⚠️ This will overwrite your current database!')
                )
                self.restore_database(db_file_path)
                
                # 4. Restore media files if requested and available
                if options['restore_media']:
                    self.restore_media_files(temp_dir)
                
                self.stdout.write(
                    self.style.SUCCESS('✅ Restore completed successfully!')
                )
                logger.info(f'Database restored from: {backup_file}')
                
            finally:
                # Cleanup temporary directory
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Restore failed: {str(e)}')
            )
            logger.error(f'Database restore failed: {str(e)}')
            raise

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
    
    def decrypt_backup(self, encrypted_file, key_file_path, temp_dir):
        """Decrypt encrypted backup file"""
        try:
            # Find key file
            if not key_file_path:
                key_file_path = encrypted_file.replace('.encrypted', '.key')
            
            if not os.path.exists(key_file_path):
                raise Exception(f'Encryption key file not found: {key_file_path}')
            
            # Read key
            with open(key_file_path, 'rb') as key_file:
                key = key_file.read()
            
            # Decrypt
            fernet = Fernet(key)
            with open(encrypted_file, 'rb') as encrypted:
                decrypted_data = fernet.decrypt(encrypted.read())
            
            # Save decrypted file
            decrypted_path = os.path.join(temp_dir, 'decrypted_backup')
            with open(decrypted_path, 'wb') as decrypted_file:
                decrypted_file.write(decrypted_data)
            
            self.stdout.write('🔓 Backup decrypted successfully')
            return decrypted_path
            
        except Exception as e:
            raise Exception(f'Decryption failed: {str(e)}')
    
    def extract_backup(self, zip_file, temp_dir):
        """Extract ZIP backup and return database file path"""
        try:
            with zipfile.ZipFile(zip_file, 'r') as zipf:
                zipf.extractall(temp_dir)
            
            # Find database file
            db_file = os.path.join(temp_dir, 'database.sql')
            if os.path.exists(db_file):
                self.stdout.write('📦 Backup extracted successfully')
                return db_file
            else:
                raise Exception('Database file not found in backup')
                
        except Exception as e:
            raise Exception(f'Extraction failed: {str(e)}')
    
    def restore_database(self, db_file_path):
        """Restore database from file"""
        db_settings = settings.DATABASES['default']
        
        if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
            self.restore_sqlite(db_settings, db_file_path)
        elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
            self.restore_postgresql(db_settings, db_file_path)
        elif db_settings['ENGINE'] == 'django.db.backends.mysql':
            self.restore_mysql(db_settings, db_file_path)
        else:
            raise Exception(f'Unsupported database engine: {db_settings["ENGINE"]}')
    
    def restore_media_files(self, temp_dir):
        """Restore media files from backup"""
        media_backup_dir = os.path.join(temp_dir, 'media')
        
        if os.path.exists(media_backup_dir):
            if hasattr(settings, 'MEDIA_ROOT'):
                # Backup existing media
                if os.path.exists(settings.MEDIA_ROOT):
                    backup_existing = f'{settings.MEDIA_ROOT}_backup_{int(datetime.now().timestamp())}'
                    shutil.move(settings.MEDIA_ROOT, backup_existing)
                    self.stdout.write(f'📁 Existing media backed up to: {backup_existing}')
                
                # Restore media files
                shutil.copytree(media_backup_dir, settings.MEDIA_ROOT)
                self.stdout.write('📁 Media files restored successfully')
            else:
                self.stdout.write('⚠️ MEDIA_ROOT not configured, skipping media restore')
        else:
            self.stdout.write('⚠️ No media files found in backup')