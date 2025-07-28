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
        
        # Use comprehensive backup command
        result = subprocess.run([
            'python', 'manage.py', 'comprehensive_backup',
            '--output-dir', 'backups'
        ], capture_output=True, text=True, cwd=os.getcwd())
        
        # Find the created backup file
        if result.returncode == 0:
            # Look for the most recent comprehensive backup file
            backup_files = [f for f in os.listdir('backups') if f.startswith('comprehensive_backup_') and f.endswith('.json')]
            if backup_files:
                backup_files.sort(reverse=True)
                backup_filename = backup_files[0]
                backup_path = os.path.join('backups', backup_filename)
            else:
                # Fallback to original filename if comprehensive backup not found
                pass
        
        if result.returncode == 0:
            # Get file size
            file_size = os.path.getsize(backup_path)
            size_kb = round(file_size / 1024, 2)
            
            # Count records
            try:
                with open(backup_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                record_count = len(data)
            except:
                record_count = 0
            
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
        else:
            print(f"❌ Backup failed: {result.stderr}")
            return Response({
                'success': False,
                'message': 'Backup creation failed',
                'error': result.stderr
            }, status=500)
            
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
    Restore database from backup file with emergency backup creation
    """
    try:
        # Set environment variable to disable signals FIRST, before any operations
        os.environ['DJANGO_DISABLE_SIGNALS'] = 'True'
        print("🔇 Signals disabled for restore process")
        print(f"🔍 DJANGO_DISABLE_SIGNALS = {os.environ.get('DJANGO_DISABLE_SIGNALS')}")
        
        backup_filename = request.data.get('backup_filename')
        if not backup_filename:
            return Response({'success': False, 'message': 'Backup filename required'})
        
        backup_path = os.path.join('backups', backup_filename)
        if not os.path.exists(backup_path):
            return Response({'success': False, 'message': 'Backup file not found'})
        
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
        
        # Clear existing non-admin data (signals are already disabled)
        print("🗑️ Clearing existing data...")
        Member.objects.all().delete()
        Trainer.objects.all().delete()
        CustomUser.objects.filter(role__in=['member', 'trainer']).delete()
        
        # Clear Community models
        from apps.Community.models import Announcement, Challenge, FAQCategory, FAQ
        Announcement.objects.all().delete()
        Challenge.objects.all().delete()
        FAQ.objects.all().delete()
        FAQCategory.objects.all().delete()
        
        # Clear Purchase models
        from apps.Purchase.models import Product, Purchase
        Purchase.objects.all().delete()
        Product.objects.all().delete()
        
        # Clear Training models
        from apps.Member.models import Training
        Training.objects.all().delete()
        
        # Restore users first
        user_records = [item for item in backup_data if item.get('model') == 'Authentication.customuser']
        print(f"🔍 Found {len(user_records)} user records")
        
        restored_users = {}
        
        for user_data in user_records:
            try:
                fields = user_data.get('fields', {})
                pk = user_data.get('pk')
                
                print(f"🔍 Processing user: {fields.get('username')} (Role: {fields.get('role')}, PK: {pk})")
                
                # Skip admin users (keep existing ones)
                if fields.get('role') == 'admin':
                    print(f"⏭️ Skipping admin user: {fields.get('username')}")
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
                print(f"✅ Restored user: {user.username} (Role: {user.role}, New ID: {user.id})")
                
            except Exception as e:
                print(f"❌ Failed to restore user {pk}: {e}")
        
        # Restore Members
        member_records = [item for item in backup_data if item.get('model') == 'Member.member']
        restored_members = 0
        
        for member_data in member_records:
            try:
                fields = member_data.get('fields', {})
                
                # Try to find user by username if user_id is None
                user = None
                if fields.get('user'):
                    user = restored_users.get(fields.get('user'))
                
                # If no user found, try to match by name
                if not user:
                    member_name = f"{fields.get('first_name', '')} {fields.get('last_name', '')}".strip()
                    for restored_user in restored_users.values():
                        if isinstance(restored_user, CustomUser):
                            user_name = f"{restored_user.first_name} {restored_user.last_name}".strip()
                            if user_name == member_name or restored_user.role == 'member':
                                user = restored_user
                                break
                
                member = Member.objects.create(
                    user=user,
                    athlete_id=fields.get('athlete_id'),
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
                
                print(f"✅ Restored Member: {member.first_name} {member.last_name} (ID: {member.athlete_id}) with user: {user.username if user else 'None'}")
                restored_members += 1
                
            except Exception as e:
                print(f"❌ Failed to restore member: {e}")
        
        # Restore Products
        from apps.Purchase.models import Product, Purchase
        product_records = [item for item in backup_data if item.get('model') == 'Purchase.product']
        print(f"🔍 Found {len(product_records)} product records to restore")
        restored_products = 0
        
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
        
        # Restore Community Models
        from apps.Community.models import Announcement, Challenge, FAQCategory, FAQ
        
        # Restore Announcements
        announcement_records = [item for item in backup_data if item.get('model') == 'Community.announcement']
        print(f"🔍 Found {len(announcement_records)} announcement records to restore")
        restored_announcements = 0
        
        for announcement_data in announcement_records:
            try:
                fields = announcement_data.get('fields', {})
                pk = announcement_data.get('pk')
                
                announcement = Announcement.objects.create(
                    title=fields.get('title', ''),
                    content=fields.get('content', '')
                )
                
                print(f"✅ Restored Announcement: {announcement.title} (ID: {announcement.id})")
                restored_announcements += 1
                
            except Exception as e:
                print(f"❌ Failed to restore announcement {pk}: {e}")
        
        # Restore Challenges
        challenge_records = [item for item in backup_data if item.get('model') == 'Community.challenge']
        print(f"🔍 Found {len(challenge_records)} challenge records to restore")
        restored_challenges = 0
        
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
        restored_faq_categories = 0
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
        restored_faqs = 0
        
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
        
        # Restore Trainers
        trainer_records = [item for item in backup_data if item.get('model') == 'Member.trainer']
        print(f"🔍 Found {len(trainer_records)} trainer records to restore")
        restored_trainers = 0
        
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
        
        # Restore Trainings
        from apps.Member.models import Training
        training_records = [item for item in backup_data if item.get('model') == 'Member.training']
        print(f"🔍 Found {len(training_records)} training records to restore")
        restored_trainings = 0
        
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
            f"Restored {len(restored_users)} users, {restored_members} members, {restored_trainers} trainers."
        )
        
        return Response({
            'success': True,
            'message': f'Database restore completed successfully',
            'details': {
                'restored_from': backup_filename,
                'users_restored': len(restored_users),
                'members_restored': restored_members,
                'trainers_restored': restored_trainers,
                'products_restored': restored_products,
                'purchases_restored': restored_purchases,
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
        # Always re-enable signals after restore
        if 'DJANGO_DISABLE_SIGNALS' in os.environ:
            del os.environ['DJANGO_DISABLE_SIGNALS']

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
            'users': users
        })
        
    except Exception as e:
        return Response({'success': False, 'message': f'Error reading backup: {str(e)}'})





















