import subprocess
import json
import os
from datetime import datetime
from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny, AllowAny
from rest_framework.response import Response
from .models import SiteSettings
from django.db import transaction
from django.core.management import call_command
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
import tempfile

def validate_backup_file(backup_path):
    """Validate backup file integrity and structure"""
    try:
        with open(backup_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            return {'valid': False, 'error': 'Invalid backup format - not a list'}
        
        if len(data) == 0:
            return {'valid': False, 'error': 'Empty backup file'}
        
        # Check for required models
        models_found = set()
        for item in data:
            if 'model' in item and 'fields' in item:
                models_found.add(item['model'])
        
        print(f"🔍 Backup validation - Found models: {models_found}")
        return {'valid': True, 'models': models_found, 'records': len(data)}
        
    except json.JSONDecodeError:
        return {'valid': False, 'error': 'Invalid JSON format'}
    except Exception as e:
        return {'valid': False, 'error': str(e)}

def clear_existing_data(restore_options):
    """Selectively clear existing data based on restore options"""
    from apps.Member.models import Member, MembershipPayment, Trainer, Training
    from apps.Community.models import Announcement, Challenge, FAQCategory, FAQ
    from apps.Purchase.models import Product, Purchase
    from apps.Stock.models import StockIn, StockOut, PermanentlyDeletedSale, SalesSummarySnapshot
    from apps.Authentication.models import CustomUser
    
    if restore_options.get('payments', False):
        print("🗑️ Clearing membership payments...")
        MembershipPayment.objects.all().delete()
    
    if restore_options.get('members', False):
        print("🗑️ Clearing members...")
        Member.objects.all().delete()
        CustomUser.objects.filter(role='member').delete()
    
    if restore_options.get('trainers', False):
        print("🗑️ Clearing trainers...")
        Training.objects.all().delete()
        Trainer.objects.all().delete()
        CustomUser.objects.filter(role='trainer').delete()
    
    if restore_options.get('products', False):
        print("🗑️ Clearing products and purchases...")
        Purchase.objects.all().delete()
        Product.objects.all().delete()
    
    if restore_options.get('stock', False):
        print("🗑️ Clearing stock data...")
        StockIn.objects.all().delete()
        StockOut.objects.all().delete()
        PermanentlyDeletedSale.objects.all().delete()
        SalesSummarySnapshot.objects.all().delete()
    
    if restore_options.get('community', False):
        print("🗑️ Clearing community data...")
        FAQ.objects.all().delete()
        FAQCategory.objects.all().delete()
        Challenge.objects.all().delete()
        Announcement.objects.all().delete()

def create_emergency_backup():
    """Create an emergency backup before restore operation (once per day)"""
    try:
        today = datetime.now().strftime('%Y%m%d')
        emergency_filename = f'emergency_backup_before_restore_{today}.json'
        emergency_path = os.path.join('backups', emergency_filename)
        
        # Check if emergency backup for today already exists
        if os.path.exists(emergency_path):
            print(f"🛡️ Emergency backup for today already exists: {emergency_filename}")
            return emergency_filename
        
        # Ensure backups directory exists
        os.makedirs('backups', exist_ok=True)
        
        # Create emergency backup using dumpdata
        result = subprocess.run([
            'python', 'manage.py', 'dumpdata',
            '--natural-foreign', '--natural-primary', '--indent=2',
            '--exclude=sessions', '--exclude=admin.logentry',
            '--exclude=contenttypes', '--exclude=auth.permission',
            '--output', emergency_path
        ], capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode == 0:
            print(f"🛡️ New emergency backup created: {emergency_filename}")
            return emergency_filename
        else:
            print(f"❌ Emergency backup failed: {result.stderr}")
            return None
            
    except Exception as e:
        print(f"❌ Emergency backup failed: {str(e)}")
        return None

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_global_notification_settings(request):
    settings_obj = SiteSettings.get_settings()
    return Response({
        'email_notifications_enabled': settings_obj.email_notifications_enabled,
        'whatsapp_notifications_enabled': settings_obj.whatsapp_notifications_enabled
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def set_global_notification_settings(request):
    settings_obj = SiteSettings.get_settings()
    email_enabled = request.data.get('email_notifications_enabled')
    whatsapp_enabled = request.data.get('whatsapp_notifications_enabled')
    if email_enabled is not None:
        settings_obj.email_notifications_enabled = bool(email_enabled)
    if whatsapp_enabled is not None:
        settings_obj.whatsapp_notifications_enabled = bool(whatsapp_enabled)
    settings_obj.save()
    return Response({
        'success': True,
        'email_notifications_enabled': settings_obj.email_notifications_enabled,
        'whatsapp_notifications_enabled': settings_obj.whatsapp_notifications_enabled
    })

@api_view(['GET'])
@permission_classes([AllowAny])  # Allow access to all users (members need to check maintenance mode)
def get_maintenance_mode(request):
    """
    Get maintenance mode status - accessible to all users
    """
    settings_obj = SiteSettings.get_settings()
    return Response({
        'enabled': settings_obj.maintenance_mode_enabled
    })

@csrf_exempt
def get_maintenance_mode_public(request):
    """
    Public maintenance mode endpoint that bypasses DRF authentication
    """
    if request.method == 'GET':
        settings_obj = SiteSettings.get_settings()
        return JsonResponse({
            'enabled': settings_obj.maintenance_mode_enabled
        })
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def set_maintenance_mode(request):
    """
    Set maintenance mode status - admin only
    """
    settings_obj = SiteSettings.get_settings()
    enabled = request.data.get('enabled')
    if enabled is not None:
        settings_obj.maintenance_mode_enabled = bool(enabled)
        settings_obj.save()
    return Response({
        'success': True,
        'enabled': settings_obj.maintenance_mode_enabled
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_backup_database(request):
    """
    Admin endpoint to create database backup
    """
    print(f"🔍 Backup request received from user: {request.user}")
    
    try:
        # Generate timestamp for backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'gym_backup_{timestamp}.json'
        backup_path = os.path.join('backups', backup_filename)
        
        # Ensure backups directory exists
        os.makedirs('backups', exist_ok=True)
        
        print(f"🔄 Creating backup: {backup_filename}")
        
        # Use Django serialization directly to avoid subprocess issues
        from django.core import serializers
        from django.apps import apps
        
        # Get all models to backup including Stock models
        models_to_backup = [
            ('Authentication', 'CustomUser'),
            ('Member', 'Member'),
            ('Member', 'MembershipPayment'),
            ('Member', 'Trainer'),
            ('Member', 'Training'),
            ('Purchase', 'Product'),
            ('Purchase', 'Purchase'),
            ('Stock', 'StockIn'),
            ('Stock', 'StockOut'),
            ('Stock', 'PermanentlyDeletedSale'),
            ('Stock', 'SalesSummarySnapshot'),
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
        
        all_data = []
        record_count = 0
        
        for app_label, model_name in models_to_backup:
            try:
                model_class = apps.get_model(app_label, model_name)
                objects = model_class.objects.all()
                
                if objects.exists():
                    serialized_data = serializers.serialize(
                        'json',
                        objects,
                        use_natural_foreign_keys=False,
                        use_natural_primary_keys=False
                    )
                    
                    model_data = json.loads(serialized_data)
                    all_data.extend(model_data)
                    record_count += len(model_data)
                    print(f'✅ Backed up {len(model_data)} {app_label}.{model_name} records')
                    
            except Exception as e:
                print(f'⚠️ Skipping {app_label}.{model_name}: {str(e)}')
                continue
        
        # Save backup to file
        with open(backup_path, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, indent=2, ensure_ascii=False, default=str)
        
        # Check if backup was created successfully
        if os.path.exists(backup_path):
            # Get file size
            file_size = os.path.getsize(backup_path)
            size_kb = round(file_size / 1024, 2)
            
            print(f"✅ Backup created successfully: {backup_filename}")
            return Response({
                'success': True,
                'message': 'Database backup created successfully!',
                'details': {
                    'filename': backup_filename,
                    'records': record_count,
                    'size_kb': size_kb
                }
            })

            
    except Exception as e:
        print(f"❌ Backup failed with exception: {str(e)}")
        return Response({
            'success': False,
            'message': f'Backup failed: {str(e)}'
        }, status=500)

@staff_member_required
def admin_backup_status(request):
    """
    Get backup system status and recent backups
    """
    try:
        backup_files = []
        if os.path.exists('backups'):
            for filename in os.listdir('backups'):
                if (filename.startswith('gym_backup_') or filename.startswith('comprehensive_backup_')) and filename.endswith('.json'):
                    filepath = os.path.join('backups', filename)
                    stat = os.stat(filepath)
                    backup_files.append({
                        'filename': filename,
                        'size_kb': round(stat.st_size / 1024, 2),
                        'created': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        # Sort by creation time (newest first)
        backup_files.sort(key=lambda x: x['created'], reverse=True)
        
        return JsonResponse({
            'success': True,
            'total_backups': len(backup_files),
            'recent_backups': backup_files[:5],  # Last 5 backups
            'backup_directory': os.path.abspath('backups')
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error getting backup status: {str(e)}'
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_restore_database(request):
    """
    Selective restore database from backup file with merge options
    """
    try:
        # Get restore options from request
        restore_options = request.data.get('restore_options', {
            'members': True,
            'trainers': True,
            'products': True,
            'purchases': True,
            'stock': True,
            'community': True,
            'payments': True,
            'merge_strategy': 'replace'  # 'replace', 'merge', 'skip_existing'
        })
        
        merge_strategy = restore_options.get('merge_strategy', 'replace')
        print(f"🔧 Restore strategy: {merge_strategy}")
        print(f"🔧 Restore options: {restore_options}")
        # Disconnect Django signals to prevent revenue recalculation
        from django.db.models.signals import post_save, pre_save, post_delete
        from apps.Member.models import Member, MembershipPayment
        
        # Store original signal handlers
        original_handlers = []
        
        # Disconnect ALL signals globally
        import django.db.models.signals as signals
        for signal_name in ['post_save', 'pre_save', 'post_delete', 'pre_delete', 'm2m_changed']:
            signal = getattr(signals, signal_name)
            # Get all receivers for all senders
            receivers_copy = signal.receivers[:]
            for receiver_data in receivers_copy:
                original_handlers.append((signal, receiver_data))
                # Disconnect using the receiver function
                if len(receiver_data) >= 2:
                    signal.disconnect(receiver_data[1])
        
        # Specifically disconnect Member signals to prevent revenue duplication
        from apps.Member.signals import update_membership_revenue_on_save, handle_member_deletion
        post_save.disconnect(update_membership_revenue_on_save, sender=Member)
        post_delete.disconnect(handle_member_deletion, sender=Member)
        
        print(f"🔇 Disconnected {len(original_handlers)} signal handlers globally")
        print(f"🔇 Specifically disconnected Member revenue signals")
        
        # Also set environment variable as backup
        os.environ['DJANGO_DISABLE_SIGNALS'] = 'True'
        
        backup_filename = request.data.get('backup_filename')
        if not backup_filename:
            return Response({'success': False, 'message': 'Backup filename required'})
        
        backup_path = os.path.join('backups', backup_filename)
        if not os.path.exists(backup_path):
            return Response({'success': False, 'message': 'Backup file not found'})
        
        # Validate backup before proceeding
        validation_result = validate_backup_file(backup_path)
        if not validation_result['valid']:
            return Response({
                'success': False, 
                'message': f'Invalid backup file: {validation_result["error"]}'
            })
        
        # Create emergency backup before restore
        emergency_backup_path = create_emergency_backup()
        print(f"🛡️ Emergency backup created: {emergency_backup_path}")
        
        # Load backup data to inspect it
        with open(backup_path, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        print(f"🔍 Total records in backup: {len(backup_data)}")
        
        # Debug what models we have
        model_counts = {}
        for item in backup_data:
            model = item.get('model', 'unknown')
            model_counts[model] = model_counts.get(model, 0) + 1
        print(f"🔍 Models in backup: {model_counts}")
        
        from apps.Member.models import Member
        from apps.Member.models import Trainer
        from apps.Authentication.models import CustomUser
        
        print("🔍 Checking model imports...")
        print(f"Member model: {Member}")
        print(f"Trainer model: {Trainer}")
        print(f"CustomUser model: {CustomUser}")
        
        # Selective data clearing based on restore options and strategy
        if merge_strategy == 'replace':
            print("🗑️ Clearing existing data for replacement...")
            clear_existing_data(restore_options)
        else:
            print(f"🔄 Using {merge_strategy} strategy - preserving existing data")
        
        # Restore users first (if needed for members/trainers)
        restored_users = {}
        if restore_options.get('members', False) or restore_options.get('trainers', False):
            user_records = [item for item in backup_data if item.get('model') == 'Authentication.customuser']
            print(f"🔍 Found {len(user_records)} user records")
            
            for user_data in user_records:
                try:
                    fields = user_data.get('fields', {})
                    pk = user_data.get('pk')
                    
                    print(f"🔍 Processing user: {fields.get('username')} (Role: {fields.get('role')}, PK: {pk})")
                    
                    # Skip admin users (keep existing ones)
                    if fields.get('role') == 'admin':
                        print(f"⏭️ Skipping admin user: {fields.get('username')}")
                        continue
                    
                    # Handle existing users based on merge strategy
                    existing_user = CustomUser.objects.filter(username=fields.get('username')).first()
                    
                    if existing_user:
                        if merge_strategy == 'skip_existing':
                            print(f"⏭️ User {fields.get('username')} exists, skipping")
                            restored_users[pk] = existing_user
                            continue
                        elif merge_strategy == 'merge':
                            print(f"🔄 User {fields.get('username')} exists, updating")
                            existing_user.email = fields.get('email', existing_user.email)
                            existing_user.first_name = fields.get('first_name', existing_user.first_name)
                            existing_user.last_name = fields.get('last_name', existing_user.last_name)
                            existing_user.save()
                            restored_users[pk] = existing_user
                            continue
                    
                    # Create user without specifying ID (let Django auto-assign)
                    user = CustomUser.objects.create(
                        username=fields.get('username'),
                        email=fields.get('email'),
                        first_name=fields.get('first_name', ''),
                        last_name=fields.get('last_name', ''),
                        role=fields.get('role'),
                        is_active=fields.get('is_active', True),
                        password=fields.get('password'),  # Already hashed
                        email_notifications=fields.get('email_notifications', True),
                        whatsapp_notifications=fields.get('whatsapp_notifications', False)
                    )
                    
                    # Map both old PK and username for lookup
                    restored_users[pk] = user
                    restored_users[fields.get('username')] = user
                    print(f"✅ Restored user: {user.username} (Role: {user.role}, Old PK: {pk}, New ID: {user.id})")
                    print(f"🔍 User mapping: PK {pk} -> {user.username}, Username {fields.get('username')} -> {user.username}")
                
                except Exception as e:
                    print(f"❌ Failed to restore user {pk}: {e}")
        
        # Restore Members (if enabled)
        restored_members = 0
        if restore_options.get('members', False):
            member_records = [item for item in backup_data if item.get('model') == 'Member.member']
            print(f"🔍 Found {len(member_records)} member records to restore")
            print(f"🔍 Available restored_users: {list(restored_users.keys())}")
            
            # Users will be matched by their original relationships or by name matching
            
            for i, member_data in enumerate(member_records):
                try:
                    fields = member_data.get('fields', {})
                    # For Member model, the user ID is stored as the primary key, not in fields
                    old_user_id = member_data.get('pk')  # This is the user ID for Member model
                
                    # Try to find the correct user by original ID first
                    user = None
                    original_username = None
                    
                    # First, get the original username from backup data
                    for user_record in backup_data:
                        if user_record.get('model') == 'Authentication.customuser' and user_record.get('pk') == old_user_id:
                            original_username = user_record.get('fields', {}).get('username')
                            print(f"🔍 Found original username for user ID {old_user_id}: {original_username}")
                            break
                    
                    # Try to find user by original ID in restored_users
                    if old_user_id and old_user_id in restored_users:
                        potential_user = restored_users[old_user_id]
                        if isinstance(potential_user, CustomUser):
                            # Check if this user is already linked to a member
                            if not Member.objects.filter(user=potential_user).exists():
                                user = potential_user
                                print(f"🔍 Found user by original ID {old_user_id}: {user.username} (ID: {user.id})")
                            else:
                                print(f"⚠️ User {potential_user.username} (ID: {old_user_id}) already linked to another member")
                    
                    # If not found by ID, try to find by original username in restored_users
                    if not user and original_username:
                        for pk, restored_user in restored_users.items():
                            if isinstance(restored_user, CustomUser) and restored_user.username == original_username:
                                if not Member.objects.filter(user=restored_user).exists():
                                    user = restored_user
                                    print(f"🔍 Found user by username in restored_users: {user.username} (ID: {user.id})")
                                    break
                                else:
                                    print(f"⚠️ User {original_username} in restored_users already linked to another member")
                    
                    # If still not found, try to find existing user by username in database
                    if not user and original_username:
                        try:
                            existing_user = CustomUser.objects.get(username=original_username)
                            if not Member.objects.filter(user=existing_user).exists():
                                user = existing_user
                                print(f"🔍 Found existing user by username in database: {user.username} (ID: {user.id})")
                            else:
                                print(f"⚠️ User {original_username} in database already linked to another member")
                        except CustomUser.DoesNotExist:
                            print(f"⚠️ User {original_username} not found in database")
                    
                    # If still no user found, try name matching as last resort
                    if not user:
                        member_name = f"{fields.get('first_name', '')} {fields.get('last_name', '')}".strip()
                        for restored_user in restored_users.values():
                            if isinstance(restored_user, CustomUser) and restored_user.role == 'member':
                                # Check if user is already linked to a member
                                if Member.objects.filter(user=restored_user).exists():
                                    continue
                                    
                                user_name = f"{restored_user.first_name} {restored_user.last_name}".strip()
                                if user_name == member_name:
                                    user = restored_user
                                    print(f"🔍 Found user by name match: {user.username} (ID: {user.id})")
                                    break
                    
                    # If still no user found, try to get original username from backup data
                    if not user:
                        original_username = None
                        original_email = None
                        original_password = None
                        
                        # Look for user in backup data to get original username
                        for user_record in backup_data:
                            if user_record.get('model') == 'Authentication.customuser' and user_record.get('pk') == old_user_id:
                                user_fields = user_record.get('fields', {})
                                original_username = user_fields.get('username')
                                original_email = user_fields.get('email')
                                original_password = user_fields.get('password')
                                print(f"🔍 Found original user data: username={original_username}, email={original_email}")
                                break
                        
                        # If we found original username, try to use it
                        if original_username:
                            # Check if original username is available
                            if not CustomUser.objects.filter(username=original_username).exists():
                                # Use original username
                                username = original_username
                                email = original_email or f"{username}@gym.local"
                                password = original_password or 'pbkdf2_sha256$600000$temp$temp'
                                print(f"🔍 Using original username: {username}")
                            else:
                                # Original username exists, try with suffix
                                base_username = original_username
                                counter = 1
                                username = f"{base_username}_{counter}"
                                while CustomUser.objects.filter(username=username).exists():
                                    counter += 1
                                    username = f"{base_username}_{counter}"
                                email = f"{username}@gym.local"
                                password = 'pbkdf2_sha256$600000$temp$temp'
                                print(f"🔍 Original username taken, using: {username}")
                        else:
                            # Fallback to generated username
                            first_name = fields.get('first_name', '')
                            last_name = fields.get('last_name', '')
                            
                            # Generate unique username and email
                            import time
                            timestamp = int(time.time())
                            username = f"{first_name.lower()}{timestamp}"
                            email = f"{username}@gym.local"
                            password = 'pbkdf2_sha256$600000$temp$temp'
                            
                            # Ensure username and email are unique
                            counter = 1
                            while CustomUser.objects.filter(username=username).exists() or CustomUser.objects.filter(email=email).exists():
                                username = f"{first_name.lower()}{timestamp}_{counter}"
                                email = f"{username}@gym.local"
                                counter += 1
                            print(f"🔍 No original username found, generated: {username}")
                        
                        user = CustomUser.objects.create(
                            username=username,
                            email=email,
                            first_name=fields.get('first_name', ''),
                            last_name=fields.get('last_name', ''),
                            role='member',
                            is_active=True,
                            password=password,
                            email_notifications=True,
                            whatsapp_notifications=False
                        )
                        print(f"✅ Created user for member: {username} (ID: {user.id})")
                    
                    # Ensure we have a valid user
                    if not user or not user.id:
                        print(f"❌ No valid user found for member {fields.get('athlete_id')}, skipping")
                        continue
                        
                    # No need to track used_users since we check Member.objects.filter(user=user) directly
                    
                    athlete_id = fields.get('athlete_id')
                    existing_member = Member.objects.filter(athlete_id=athlete_id).first()
                    
                    if existing_member and merge_strategy == 'skip_existing':
                        print(f"⏭️ Member {athlete_id} exists, skipping")
                        continue
                    elif existing_member and merge_strategy == 'merge':
                        print(f"🔄 Member {athlete_id} exists, updating")
                        existing_member.first_name = fields.get('first_name', existing_member.first_name)
                        existing_member.last_name = fields.get('last_name', existing_member.last_name)
                        existing_member.phone = fields.get('phone', existing_member.phone)
                        existing_member.monthly_fee = fields.get('monthly_fee', existing_member.monthly_fee)
                        existing_member.save()
                        restored_members += 1
                        continue
                    
                    # For skip_existing strategy, only create if member doesn't exist
                    if not existing_member:
                        try:
                            print(f"🔍 Creating member with user: {user.username} (ID: {user.id})")
                            
                            # Check if user is already linked to another member (primary key conflict)
                            if Member.objects.filter(user=user).exists():
                                print(f"⚠️ User {user.username} already linked to another member, skipping")
                                continue
                            
                            # Create member using Django ORM (signals already disconnected)
                            member = Member.objects.create(
                                user=user,
                                athlete_id=athlete_id,
                                first_name=fields.get('first_name', ''),
                                last_name=fields.get('last_name', ''),
                                phone=fields.get('phone', ''),
                                monthly_fee=fields.get('monthly_fee', '0.00'),
                                membership_type=fields.get('membership_type', 'gym'),
                                start_date=fields.get('start_date'),
                                expiry_date=fields.get('expiry_date'),
                                box_number=fields.get('box_number'),
                                time_slot=fields.get('time_slot', 'morning'),
                                is_active=fields.get('is_active', True),
                                biometric_hash=fields.get('biometric_hash'),
                                biometric_registered=fields.get('biometric_registered', False),
                                notified_expired=fields.get('notified_expired', False),
                                delete_requested=fields.get('delete_requested', False)
                            )
                            
                            restored_members += 1
                            print(f"✅ Restored Member: {member.first_name} {member.last_name} (ID: {member.athlete_id}) with user: {user.username if user else 'None'}")
                        except Exception as create_error:
                            print(f"❌ Failed to create member {athlete_id}: {create_error}")
                            continue

                    
                except Exception as e:
                    print(f"❌ Failed to restore member: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Restore Products (if enabled)
        restored_products = 0
        if restore_options.get('products', False):
            from apps.Purchase.models import Product, Purchase
            product_records = [item for item in backup_data if item.get('model') == 'Purchase.product']
            print(f"🔍 Found {len(product_records)} product records to restore")
            
            for product_data in product_records:
                try:
                    fields = product_data.get('fields', {})
                    pk = product_data.get('pk')
                    
                    print(f"🔍 Processing product: {fields.get('name')} (PK: {pk})")
                    
                    product = Product.objects.create(
                        name=fields.get('name', ''),
                        price=fields.get('price', '0.00'),
                        description=fields.get('description', ''),
                        image=fields.get('image')
                    )
                    
                    print(f"✅ Restored Product: {product.name} (ID: {product.product_id})")
                    restored_products += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore product {pk}: {e}")
        
            # Restore Purchases
            purchase_records = [item for item in backup_data if item.get('model') == 'Purchase.purchase']
            print(f"🔍 Found {len(purchase_records)} purchase records to restore")
            restored_purchases = 0
            
            for purchase_data in purchase_records:
                try:
                    fields = purchase_data.get('fields', {})
                    pk = purchase_data.get('pk')
                    
                    print(f"🔍 Processing purchase: {fields.get('product_name')} (PK: {pk})")
                    
                    # Find product by name if product field is None
                    product = None
                    if fields.get('product'):
                        try:
                            product = Product.objects.get(product_id=fields.get('product'))
                        except Product.DoesNotExist:
                            pass
                    
                    # Find member if exists
                    member = None
                    if fields.get('member'):
                        try:
                            member = Member.objects.get(athlete_id=fields.get('member'))
                        except Member.DoesNotExist:
                            pass
                    
                    purchase = Purchase.objects.create(
                        member=member,
                        product=product,
                        product_name=fields.get('product_name', ''),
                        quantity=fields.get('quantity', 1),
                        total_price=fields.get('total_price', '0.00'),
                        date=fields.get('date')
                    )
                    
                    print(f"✅ Restored Purchase: {purchase.product_name} (ID: {purchase.id})")
                    restored_purchases += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore purchase {pk}: {e}")
        
        else:
            restored_purchases = 0
        
        # Restore Community Models (if enabled)
        restored_announcements = 0
        restored_challenges = 0
        restored_faq_categories = 0
        restored_faqs = 0
        
        if restore_options.get('community', False):
            from apps.Community.models import Announcement, Challenge, FAQCategory, FAQ
            
            # Restore Announcements
            announcement_records = [item for item in backup_data if item.get('model') == 'Community.announcement']
            print(f"🔍 Found {len(announcement_records)} announcement records to restore")
            
            for announcement_data in announcement_records:
                try:
                    fields = announcement_data.get('fields', {})
                    pk = announcement_data.get('pk')
                    
                    # Find admin user for created_by field
                    admin_user = CustomUser.objects.filter(is_staff=True).first()
                    
                    announcement = Announcement.objects.create(
                        title=fields.get('title', ''),
                        content=fields.get('content', ''),
                        created_by=admin_user
                    )
                    
                    print(f"✅ Restored Announcement: {announcement.title} (ID: {announcement.id})")
                    restored_announcements += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore announcement {pk}: {e}")
        
            # Restore Challenges
            challenge_records = [item for item in backup_data if item.get('model') == 'Community.challenge']
            print(f"🔍 Found {len(challenge_records)} challenge records to restore")
            
            for challenge_data in challenge_records:
                try:
                    fields = challenge_data.get('fields', {})
                    pk = challenge_data.get('pk')
                    
                    # Find admin user for created_by field
                    admin_user = CustomUser.objects.filter(is_staff=True).first()
                    
                    challenge = Challenge.objects.create(
                        title=fields.get('title', ''),
                        description=fields.get('description', ''),
                        start_date=fields.get('start_date'),
                        end_date=fields.get('end_date'),
                        created_by=admin_user
                    )
                    
                    print(f"✅ Restored Challenge: {challenge.title} (ID: {challenge.id})")
                    restored_challenges += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore challenge {pk}: {e}")
        
            # Restore FAQ Categories
            faq_category_records = [item for item in backup_data if item.get('model') == 'Community.faqcategory']
            print(f"🔍 Found {len(faq_category_records)} FAQ category records to restore")
            category_mapping = {}  # Map old IDs to new objects
            
            for faq_category_data in faq_category_records:
                try:
                    fields = faq_category_data.get('fields', {})
                    old_pk = faq_category_data.get('pk')
                    
                    faq_category = FAQCategory.objects.create(
                        name=fields.get('name', '')
                    )
                    
                    # Store mapping for FAQ restoration
                    category_mapping[old_pk] = faq_category
                    
                    print(f"✅ Restored FAQ Category: {faq_category.name} (Old ID: {old_pk}, New ID: {faq_category.id})")
                    restored_faq_categories += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore FAQ category {old_pk}: {e}")
        
            # Restore FAQs (must be after categories)
            faq_records = [item for item in backup_data if item.get('model') == 'Community.faq']
            print(f"🔍 Found {len(faq_records)} FAQ records to restore")
            print(f"🔍 Available category mappings: {list(category_mapping.keys())}")
            
            for faq_data in faq_records:
                try:
                    fields = faq_data.get('fields', {})
                    pk = faq_data.get('pk')
                    
                    # Find category using mapping
                    category = None
                    if fields.get('category'):
                        category = category_mapping.get(fields.get('category'))
                        print(f"🔍 FAQ category mapping: {fields.get('category')} -> {category}")
                    
                    faq = FAQ.objects.create(
                        category=category,
                        question=fields.get('question', ''),
                        answer=fields.get('answer', '')
                    )
                    
                    print(f"✅ Restored FAQ: {faq.question[:50]}... (ID: {faq.id}, Category: {category.name if category else 'None'})")
                    restored_faqs += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore FAQ {pk}: {e}")
        
        # Restore Trainers (if enabled)
        restored_trainers = 0
        if restore_options.get('trainers', False):
            trainer_records = [item for item in backup_data if item.get('model') == 'Member.trainer']
            print(f"🔍 Found {len(trainer_records)} trainer records to restore")
            
            for trainer_data in trainer_records:
                try:
                    fields = trainer_data.get('fields', {})
                    pk = trainer_data.get('pk')
                    
                    print(f"🔍 Processing trainer: {fields.get('first_name')} {fields.get('last_name')} (PK: {pk})")
                    print(f"🔍 Trainer fields: {fields}")
                    
                    # Try to find user by username if user_id is None
                    user = None
                    if fields.get('user'):
                        user = restored_users.get(fields.get('user'))
                        print(f"🔍 Found user by ID: {user}")
                    
                    # If no user found, try to match by name or find trainer role user
                    if not user:
                        trainer_name = f"{fields.get('first_name', '')} {fields.get('last_name', '')}".strip()
                        print(f"🔍 Looking for user matching trainer name: {trainer_name}")
                        for restored_user in restored_users.values():
                            if isinstance(restored_user, CustomUser):
                                user_name = f"{restored_user.first_name} {restored_user.last_name}".strip()
                                print(f"🔍 Comparing with user: {user_name} (role: {restored_user.role})")
                                if user_name == trainer_name or restored_user.role == 'trainer':
                                    user = restored_user
                                    print(f"🔍 Matched user: {user}")
                                    break
                    
                    print(f"🔍 Creating trainer with user: {user}")
                    
                    # Create trainer without user field if it doesn't exist
                    trainer_fields = {
                        'trainer_id': fields.get('trainer_id'),
                        'first_name': fields.get('first_name', ''),
                        'last_name': fields.get('last_name', '') or fields.get('last__name', ''),  # Handle typo
                        'phone': fields.get('phone', ''),
                        'email': fields.get('email', ''),
                        'monthly_salary': fields.get('monthly_salary', '0.00'),
                        'specialization': fields.get('specialization', 'fitness'),
                        'start_date': fields.get('start_date'),
                        'image': fields.get('image')  # Add image field
                    }
                    
                    # Only add user if the model has that field
                    if hasattr(Trainer, 'user') and user:
                        trainer_fields['user'] = user
                    
                    trainer = Trainer.objects.create(**trainer_fields)
                    
                    print(f"✅ Restored Trainer: {trainer.first_name} {trainer.last_name} (ID: {trainer.trainer_id}) with user: {user.username if user else 'None'}")
                    restored_trainers += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore trainer {pk}: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Restore MembershipPayment records (if enabled)
        restored_payments = 0
        if restore_options.get('payments', False):
            payment_records = [item for item in backup_data if item.get('model') == 'Member.membershippayment']
            print(f"🔍 Found {len(payment_records)} membership payment records to restore")
            
            for payment_data in payment_records:
                try:
                    fields = payment_data.get('fields', {})
                    member_id = fields.get('member')
                    
                    # Find the restored member
                    member = None
                    if member_id:
                        try:
                            member = Member.objects.get(athlete_id=member_id)
                        except Member.DoesNotExist:
                            print(f"⚠️ Member {member_id} not found for payment, skipping")
                            continue
                    
                    if member:
                        # Create payment using Django ORM (signals already disconnected)
                        try:
                            payment = MembershipPayment.objects.create(
                                member=member,
                                amount=fields.get('amount', '0.00')
                            )
                            restored_payments += 1
                            print(f"✅ Restored MembershipPayment: {member.first_name} {member.last_name} - {payment.amount} AFN")
                        except Exception as e:
                            print(f"❌ Failed to restore membership payment: {e}")
                    
                except Exception as e:
                    print(f"❌ Failed to restore membership payment: {e}")
        
        # Restore Stock models (if enabled)
        restored_stockin = 0
        restored_stockout = 0
        restored_deleted_sales = 0
        restored_sales_summaries = 0
        
        if restore_options.get('stock', False):
            from apps.Stock.models import StockIn, StockOut, PermanentlyDeletedSale, SalesSummarySnapshot
            
            # Restore StockIn records
            stockin_records = [item for item in backup_data if item.get('model') == 'Stock.stockin']
            print(f"🔍 Found {len(stockin_records)} stock-in records to restore")
            
            for stockin_data in stockin_records:
                try:
                    fields = stockin_data.get('fields', {})
                    pk = stockin_data.get('pk')
                    
                    # Find user if exists
                    created_by = None
                    if fields.get('created_by'):
                        created_by = restored_users.get(fields.get('created_by'))
                    if not created_by:
                        created_by = CustomUser.objects.filter(is_staff=True).first()
                    
                    stockin = StockIn.objects.create(
                        item=fields.get('item', ''),
                        quantity=fields.get('quantity', 0),
                        price=fields.get('price', '0.00'),
                        date=fields.get('date'),
                        created_by=created_by,
                        created_at=fields.get('created_at'),
                        updated_at=fields.get('updated_at')
                    )
                    
                    print(f"✅ Restored StockIn: {stockin.item} (ID: {stockin.id})")
                    restored_stockin += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore stock-in {pk}: {e}")
        
            # Restore StockOut records
            stockout_records = [item for item in backup_data if item.get('model') == 'Stock.stockout']
            print(f"🔍 Found {len(stockout_records)} stock-out records to restore")
            
            for stockout_data in stockout_records:
                try:
                    fields = stockout_data.get('fields', {})
                    pk = stockout_data.get('pk')
                    
                    # Find user if exists
                    created_by = None
                    if fields.get('created_by'):
                        created_by = restored_users.get(fields.get('created_by'))
                    if not created_by:
                        created_by = CustomUser.objects.filter(is_staff=True).first()
                    
                    stockout = StockOut.objects.create(
                        item=fields.get('item', ''),
                        quantity=fields.get('quantity', 0),
                        price=fields.get('price', '0.00'),
                        cost_price=fields.get('cost_price', '0.00'),
                        date=fields.get('date'),
                        created_by=created_by,
                        created_at=fields.get('created_at'),
                        updated_at=fields.get('updated_at'),
                        is_deleted=fields.get('is_deleted', False),
                        deleted_at=fields.get('deleted_at')
                    )
                    
                    print(f"✅ Restored StockOut: {stockout.item} (ID: {stockout.id})")
                    restored_stockout += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore stock-out {pk}: {e}")
        
            # Restore PermanentlyDeletedSale records
            deleted_sale_records = [item for item in backup_data if item.get('model') == 'Stock.permanentlydeletedsale']
            print(f"🔍 Found {len(deleted_sale_records)} permanently deleted sale records to restore")
            
            for deleted_sale_data in deleted_sale_records:
                try:
                    fields = deleted_sale_data.get('fields', {})
                    pk = deleted_sale_data.get('pk')
                    
                    # Find user if exists
                    created_by = None
                    if fields.get('created_by'):
                        created_by = restored_users.get(fields.get('created_by'))
                    if not created_by:
                        created_by = CustomUser.objects.filter(is_staff=True).first()
                    
                    deleted_sale = PermanentlyDeletedSale.objects.create(
                        item=fields.get('item', ''),
                        quantity=fields.get('quantity', 0),
                        price=fields.get('price', '0.00'),
                        cost_price=fields.get('cost_price', '0.00'),
                        date=fields.get('date'),
                        created_by=created_by,
                        original_created_at=fields.get('original_created_at'),
                        permanently_deleted_at=fields.get('permanently_deleted_at')
                    )
                    
                    print(f"✅ Restored PermanentlyDeletedSale: {deleted_sale.item} (ID: {deleted_sale.id})")
                    restored_deleted_sales += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore permanently deleted sale {pk}: {e}")
        
            # Restore SalesSummarySnapshot records
            sales_summary_records = [item for item in backup_data if item.get('model') == 'Stock.salessummarysnapshot']
            print(f"🔍 Found {len(sales_summary_records)} sales summary snapshot records to restore")
            
            for sales_summary_data in sales_summary_records:
                try:
                    fields = sales_summary_data.get('fields', {})
                    pk = sales_summary_data.get('pk')
                    
                    # Find user if exists
                    created_by = None
                    if fields.get('created_by'):
                        created_by = restored_users.get(fields.get('created_by'))
                    if not created_by:
                        created_by = CustomUser.objects.filter(is_staff=True).first()
                    
                    sales_summary = SalesSummarySnapshot.objects.create(
                        created_by=created_by,
                        cumulative_revenue=fields.get('cumulative_revenue', '0.00'),
                        cumulative_profit=fields.get('cumulative_profit', '0.00'),
                        last_updated=fields.get('last_updated')
                    )
                    
                    print(f"✅ Restored SalesSummarySnapshot: {sales_summary.created_by.username} (ID: {sales_summary.id})")
                    restored_sales_summaries += 1
                
                except Exception as e:
                    print(f"❌ Failed to restore sales summary snapshot {pk}: {e}")
        
        # Restore Trainings (if trainers enabled)
        restored_trainings = 0
        if restore_options.get('trainers', False):
            from apps.Member.models import Training
            training_records = [item for item in backup_data if item.get('model') == 'Member.training']
            print(f"🔍 Found {len(training_records)} training records to restore")
            
            for training_data in training_records:
                try:
                    fields = training_data.get('fields', {})
                    pk = training_data.get('pk')
                    
                    # Find trainer if exists
                    trainer = None
                    if fields.get('trainer'):
                        try:
                            trainer = Trainer.objects.get(trainer_id=fields.get('trainer'))
                        except Trainer.DoesNotExist:
                            pass
                    
                    if trainer:
                        training = Training.objects.create(
                            trainer=trainer,
                            type=fields.get('type', 'fitness'),
                            datetime=fields.get('datetime'),
                            duration=fields.get('duration', 60),
                            capacity=fields.get('capacity', 10),
                            description=fields.get('description', ''),
                            image=fields.get('image')
                        )
                        
                        print(f"✅ Restored Training: {training.type} with {trainer.first_name} (ID: {training.id})")
                        restored_trainings += 1
                    else:
                        print(f"⚠️ Skipping training {pk}: trainer not found")
                
                except Exception as e:
                    print(f"❌ Failed to restore training {pk}: {e}")
        
        # Create single notification for database restore
        from apps.Notifications.services import notification_service
        notification_service.create_notification(
            f"Database restored successfully from {backup_filename}. "
            f"Restored {len(restored_users)} users, {restored_members} members, {restored_trainers} trainers, "
            f"{restored_stockin} stock-in records, {restored_stockout} stock-out records."
        )
        
        return Response({
            'success': True,
            'message': f'Database restore completed successfully using {merge_strategy} strategy',
            'details': {
                'restored_from': backup_filename,
                'strategy': merge_strategy,
                'restore_options': restore_options,
                'users_restored': len([u for u in restored_users.values() if isinstance(u, CustomUser)]),
                'members_restored': restored_members,
                'trainers_restored': restored_trainers,
                'products_restored': restored_products,
                'purchases_restored': restored_purchases,
                'stockin_restored': restored_stockin,
                'stockout_restored': restored_stockout,
                'deleted_sales_restored': restored_deleted_sales,
                'sales_summaries_restored': restored_sales_summaries,
                'announcements_restored': restored_announcements,
                'challenges_restored': restored_challenges,
                'faq_categories_restored': restored_faq_categories,
                'faqs_restored': restored_faqs,
                'trainings_restored': restored_trainings,
                'emergency_backup': emergency_backup_path
            }
        })
        
    except Exception as e:
        print(f"Restore error: {str(e)}")
        return Response({
            'success': False,
            'message': f'Restore failed: {str(e)}'
        })
    finally:
        # Reconnect all signal handlers
        try:
            for signal, receiver_data in original_handlers:
                if len(receiver_data) >= 2:
                    signal.connect(receiver_data[1])
            
            # Specifically reconnect Member signals
            from apps.Member.signals import update_membership_revenue_on_save, handle_member_deletion
            post_save.connect(update_membership_revenue_on_save, sender=Member)
            post_delete.connect(handle_member_deletion, sender=Member)
            
            print(f"🔊 Reconnected {len(original_handlers)} signal handlers")
            print(f"🔊 Specifically reconnected Member revenue signals")
        except Exception as e:
            print(f"⚠️ Error reconnecting signals: {e}")
            
        # Remove environment variable
        if 'DJANGO_DISABLE_SIGNALS' in os.environ:
            del os.environ['DJANGO_DISABLE_SIGNALS']

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_restore_options(request):
    """
    Get available restore options and strategies
    """
    return Response({
        'success': True,
        'restore_options': {
            'members': {'label': 'Members', 'description': 'Member profiles and accounts'},
            'trainers': {'label': 'Trainers', 'description': 'Trainer profiles and training sessions'},
            'products': {'label': 'Products', 'description': 'Product catalog and purchases'},
            'stock': {'label': 'Stock', 'description': 'Inventory and sales data'},
            'community': {'label': 'Community', 'description': 'Announcements, challenges, and FAQs'},
            'payments': {'label': 'Payments', 'description': 'Membership payment records'}
        },
        'merge_strategies': {
            'replace': {'label': 'Replace All', 'description': 'Delete existing data and restore from backup'},
            'merge': {'label': 'Merge/Update', 'description': 'Update existing records, add new ones'},
            'skip_existing': {'label': 'Skip Existing', 'description': 'Only add new records, keep existing ones'}
        },
        'default_options': {
            'members': True,
            'trainers': True,
            'products': True,
            'purchases': True,
            'stock': True,
            'community': True,
            'payments': True,
            'merge_strategy': 'replace'
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_backup_files(request):
    """
    List available backup files for restore
    """
    try:
        backup_files = []
        if os.path.exists('backups'):
            for filename in os.listdir('backups'):
                if (filename.startswith('gym_backup_') or filename.startswith('comprehensive_backup_')) and filename.endswith('.json'):
                    filepath = os.path.join('backups', filename)
                    stat = os.stat(filepath)
                    backup_files.append({
                        'filename': filename,
                        'size_kb': round(stat.st_size / 1024, 2),
                        'created': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                    })
        
        # Sort by creation time (newest first)
        backup_files.sort(key=lambda x: x['created'], reverse=True)
        
        return Response({
            'success': True,
            'backups': backup_files
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to list backups: {str(e)}'
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspect_backup(request):
    filename = request.GET.get('filename')
    if not filename:
        return Response({'success': False, 'message': 'Filename required'})
    
    backup_path = os.path.join('backups', filename)
    if not os.path.exists(backup_path):
        return Response({'success': False, 'message': 'Backup file not found'})
    
    try:
        with open(backup_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Count models and debug
        model_counts = {}
        members = []
        trainers = []
        users = []
        stock_items = []
        
        for item in data:
            model = item.get('model', 'unknown')
            model_counts[model] = model_counts.get(model, 0) + 1
            
            # Collect member data
            if model == 'Member.member':
                members.append({
                    'pk': item.get('pk'),
                    'user_id': item.get('fields', {}).get('user'),
                    'athlete_id': item.get('fields', {}).get('athlete_id'),
                    'first_name': item.get('fields', {}).get('first_name'),
                    'last_name': item.get('fields', {}).get('last_name'),
                    'membership_type': item.get('fields', {}).get('membership_type'),
                    'is_active': item.get('fields', {}).get('is_active', True)
                })
            
            # Collect trainer data
            elif 'trainer' in model.lower():
                trainers.append({
                    'pk': item.get('pk'),
                    'model': model,
                    'user_id': item.get('fields', {}).get('user'),
                    'trainer_id': item.get('fields', {}).get('trainer_id'),
                    'first_name': item.get('fields', {}).get('first_name'),
                    'last_name': item.get('fields', {}).get('last_name'),
                    'email': item.get('fields', {}).get('email')
                })
            
            # Collect user data
            elif model == 'Authentication.customuser':
                users.append({
                    'pk': item.get('pk'),
                    'username': item.get('fields', {}).get('username'),
                    'role': item.get('fields', {}).get('role'),
                    'first_name': item.get('fields', {}).get('first_name'),
                    'last_name': item.get('fields', {}).get('last_name')
                })
            
            # Collect stock data
            elif model.startswith('Stock.'):
                stock_items.append({
                    'pk': item.get('pk'),
                    'model': model,
                    'item': item.get('fields', {}).get('item'),
                    'quantity': item.get('fields', {}).get('quantity'),
                    'price': item.get('fields', {}).get('price'),
                    'date': item.get('fields', {}).get('date')
                })
        
        print(f"🔍 Backup inspection - Model counts: {model_counts}")
        print(f"🔍 Backup inspection - Members found: {len(members)}")
        print(f"🔍 Backup inspection - Trainers found: {len(trainers)}")
        print(f"🔍 Backup inspection - Users found: {len(users)}")
        
        for member in members:
            print(f"📋 Member in backup: {member}")
        for trainer in trainers:
            print(f"👨‍🏫 Trainer in backup: {trainer}")
        for user in users:
            print(f"👤 User in backup: {user}")
        
        return Response({
            'success': True,
            'total_records': len(data),
            'model_counts': model_counts,
            'members': members,
            'trainers': trainers,
            'users': users,
            'stock_items': stock_items
        })
        
    except Exception as e:
        return Response({'success': False, 'message': f'Error reading backup: {str(e)}'})





















