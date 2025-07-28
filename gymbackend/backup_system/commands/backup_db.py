import os
import subprocess
import shutil
import zipfile
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
import logging
from cryptography.fernet import Fernet
import boto3
from botocore.exceptions import ClientError

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
        parser.add_argument(
            '--include-media',
            action='store_true',
            help='Include media files in backup'
        )
        parser.add_argument(
            '--encrypt',
            action='store_true',
            help='Encrypt the backup file'
        )
        parser.add_argument(
            '--upload-cloud',
            action='store_true',
            help='Upload backup to cloud storage'
        )
        parser.add_argument(
            '--encryption-key',
            type=str,
            help='Encryption key (if not provided, will be generated)'
        )

    def handle(self, *args, **options):
        try:
            # Create backup directory if it doesn't exist
            backup_dir = options['output_dir']
            os.makedirs(backup_dir, exist_ok=True)
            
            # Generate backup filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f'gym_backup_{timestamp}'
            
            # Create temporary directory for backup components
            temp_dir = os.path.join(backup_dir, f'temp_{timestamp}')
            os.makedirs(temp_dir, exist_ok=True)
            
            try:
                # 1. Database backup
                db_backup_path = os.path.join(temp_dir, 'database.sql')
                self.create_database_backup(db_backup_path, options)
                
                # 2. Media files backup (if requested)
                if options['include_media']:
                    self.backup_media_files(temp_dir)
                
                # 3. Create final backup package
                final_backup_path = self.create_backup_package(temp_dir, backup_dir, backup_filename, options)
                
                # 4. Encrypt if requested
                if options['encrypt']:
                    final_backup_path = self.encrypt_backup(final_backup_path, options.get('encryption_key'))
                
                # 5. Upload to cloud if requested
                if options['upload_cloud']:
                    self.upload_to_cloud(final_backup_path)
                
                # Verify final backup
                if os.path.exists(final_backup_path):
                    file_size = os.path.getsize(final_backup_path)
                    size_mb = round(file_size / (1024 * 1024), 2)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Complete backup created: {final_backup_path} ({size_mb} MB)'
                        )
                    )
                    logger.info(f'Complete backup created: {final_backup_path}')
                else:
                    self.stdout.write(
                        self.style.ERROR('❌ Final backup file was not created')
                    )
                    
            finally:
                # Cleanup temporary directory
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Backup failed: {str(e)}')
            )
            logger.error(f'Database backup failed: {str(e)}')
            raise

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
    
    def create_database_backup(self, backup_path, options):
        """Create database backup based on engine type"""
        db_settings = settings.DATABASES['default']
        
        if db_settings['ENGINE'] == 'django.db.backends.sqlite3':
            self.backup_sqlite(db_settings, backup_path)
        elif db_settings['ENGINE'] == 'django.db.backends.postgresql':
            self.backup_postgresql(db_settings, backup_path, options['compress'])
        elif db_settings['ENGINE'] == 'django.db.backends.mysql':
            self.backup_mysql(db_settings, backup_path, options['compress'])
        else:
            raise Exception(f'Unsupported database engine: {db_settings["ENGINE"]}')
    
    def backup_media_files(self, temp_dir):
        """Backup media files"""
        media_backup_dir = os.path.join(temp_dir, 'media')
        
        if hasattr(settings, 'MEDIA_ROOT') and os.path.exists(settings.MEDIA_ROOT):
            shutil.copytree(settings.MEDIA_ROOT, media_backup_dir)
            self.stdout.write('📁 Media files backed up')
        else:
            self.stdout.write('⚠️ No media files found to backup')
    
    def create_backup_package(self, temp_dir, backup_dir, backup_filename, options):
        """Create final backup package (ZIP)"""
        if options['compress'] or options['include_media']:
            # Create ZIP package
            zip_path = os.path.join(backup_dir, f'{backup_filename}.zip')
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zipf.write(file_path, arcname)
            self.stdout.write('📦 Backup package created')
            return zip_path
        else:
            # Just move the database file
            final_path = os.path.join(backup_dir, f'{backup_filename}.sql')
            shutil.move(os.path.join(temp_dir, 'database.sql'), final_path)
            return final_path
    
    def encrypt_backup(self, backup_path, encryption_key=None):
        """Encrypt backup file"""
        try:
            # Generate or use provided key
            if encryption_key:
                key = encryption_key.encode()
                if len(key) != 44:  # Fernet key length
                    key = Fernet.generate_key()
            else:
                key = Fernet.generate_key()
            
            # Save key to file
            key_path = f'{backup_path}.key'
            with open(key_path, 'wb') as key_file:
                key_file.write(key)
            
            # Encrypt backup
            fernet = Fernet(key)
            with open(backup_path, 'rb') as file:
                encrypted_data = fernet.encrypt(file.read())
            
            encrypted_path = f'{backup_path}.encrypted'
            with open(encrypted_path, 'wb') as encrypted_file:
                encrypted_file.write(encrypted_data)
            
            # Remove original
            os.remove(backup_path)
            
            self.stdout.write(f'🔐 Backup encrypted. Key saved to: {key_path}')
            return encrypted_path
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Encryption failed: {str(e)}'))
            return backup_path
    
    def upload_to_cloud(self, backup_path):
        """Upload backup to cloud storage (AWS S3)"""
        try:
            # Check for AWS credentials
            aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
            aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
            bucket_name = getattr(settings, 'BACKUP_S3_BUCKET', None)
            
            if not all([aws_access_key, aws_secret_key, bucket_name]):
                self.stdout.write('⚠️ AWS credentials not configured, skipping cloud upload')
                return
            
            # Upload to S3
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
            
            filename = os.path.basename(backup_path)
            s3_key = f'gym-backups/{filename}'
            
            s3_client.upload_file(backup_path, bucket_name, s3_key)
            self.stdout.write(f'☁️ Backup uploaded to S3: s3://{bucket_name}/{s3_key}')
            
        except ClientError as e:
            self.stdout.write(self.style.ERROR(f'❌ Cloud upload failed: {str(e)}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Cloud upload error: {str(e)}'))