import base64
import traceback
import json
import pytz
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date
from apps.Member.models import Member
from apps.Authentication.models import WebAuthnCredential
from apps.Attendance.models import Attendance, CheckInPhoto

def get_afghanistan_time(utc_time):
    """Convert UTC time to Afghanistan time (UTC+4:30)"""
    return utc_time + timedelta(hours=4, minutes=30)

@csrf_exempt
def webauthn_register_options(request):
    import json
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        
        # Debug logging
        print(f"Received athlete_id: {athlete_id} (type: {type(athlete_id)})")
        
        # Try to find member with this athlete_id
        try:
            member = Member.objects.get(athlete_id=athlete_id)
        except Member.DoesNotExist:
            # List available members for debugging
            available_members = list(Member.objects.values_list('athlete_id', 'first_name', 'last_name'))
            print(f"Available members: {available_members}")
            return JsonResponse({
                'error': f'Member with athlete_id "{athlete_id}" not found',
                'available_members': [f"{aid}: {fname} {lname}" for aid, fname, lname in available_members]
            }, status=404)
        challenge = base64.urlsafe_b64encode(b'some-random-challenge').decode('utf-8')
        options = {
            'challenge': challenge,
            'rp': {'name': 'Elite Fitness Club', 'id': 'localhost'},  # add 'id' if needed
            'user': {
                'id': base64.b64encode(str(member.athlete_id).encode()).decode(),
                'name': member.first_name,
                'displayName': f"{member.first_name} {member.last_name}",
            },
            'pubKeyCredParams': [
                {'type': 'public-key', 'alg': -7},   # ES256
                {'type': 'public-key', 'alg': -257}, # RS256
            ],
            'authenticatorSelection': {
                'authenticatorAttachment': 'platform',
                'userVerification': 'required',
                'requireResidentKey': True,  # Enable resident keys for automatic detection
                'residentKey': 'required'    # Explicitly require resident keys
            },
            'timeout': 60000,
            'attestation': 'direct',
        }
        request.session[f'webauthn_challenge_{athlete_id}'] = challenge
        request.session.modified = True
        return JsonResponse({'options': options})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}, status=500)
    
     
@csrf_exempt
def webauthn_register_complete(request):
    try:
        from .biometric_utils import BiometricSecurity
        
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        biometric_hash = data.get('biometric_hash')
        credential_response = data.get('credential_response', {})

        print(f"Registration attempt for athlete_id: {athlete_id}")
        print(f"Biometric hash: {biometric_hash[:50]}...")  # Log partial hash for debugging

        # Check if the member exists
        member = get_object_or_404(Member, athlete_id=athlete_id)

        # ENHANCED DUPLICATE DETECTION
        is_duplicate, existing_member = BiometricSecurity.check_duplicate_fingerprint(
            biometric_hash, exclude_member_id=athlete_id
        )
        
        if is_duplicate and existing_member:
            print(f"🚨 SECURITY ALERT: Duplicate fingerprint detected!")
            print(f"   Attempted by: {member.first_name} {member.last_name} (ID: {athlete_id})")
            print(f"   Already registered to: {existing_member.first_name} {existing_member.last_name} (ID: {existing_member.athlete_id})")
            
            return JsonResponse({
                'status': 'error', 
                'message': f'This fingerprint is already registered to {existing_member.first_name} {existing_member.last_name}. Each person must use their own unique fingerprint.',
                'error_code': 'DUPLICATE_BIOMETRIC',
                'existing_member_id': existing_member.athlete_id
            }, status=400)

        # If no duplicate found, register the new biometric hash
        # For WebAuthn compatibility, store the credential response data
        if credential_response and credential_response.get('rawId'):
            # Store the rawId from WebAuthn credential for kiosk matching
            member.biometric_hash = credential_response.get('rawId')
            print(f"Storing WebAuthn rawId: {credential_response.get('rawId')}")
        else:
            # Fallback to the provided biometric_hash
            member.biometric_hash = biometric_hash
            print(f"Storing biometric hash: {biometric_hash[:20]}...")
        
        member.biometric_registered = True
        member.save()
        
        # Send notification to member
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            # Save to database
            notification = Notification.objects.create(
                user=member.user,
                message=f"Fingerprint registered successfully for {member.first_name} {member.last_name}"
            )
            
            # Send real-time notification
            channel_layer = get_channel_layer()
            notification_data = {
                "id": notification.id,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "is_read": notification.is_read,
                "link": "/member-dashboard/attendance"
            }
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user.id}_notifications",
                {
                    "type": "send_notification",
                    "notification": notification_data
                }
            )
        except Exception as e:
            print(f"Failed to send fingerprint registration notification: {e}")
        
        print(f"✅ Fingerprint successfully registered for {member.first_name} {member.last_name}")
        return JsonResponse({
            'status': 'ok',
            'message': 'Fingerprint registered successfully',
            'member_name': f"{member.first_name} {member.last_name}"
        })
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'status': 'error', 'message': str(e), 'traceback': traceback.format_exc()}, status=500)

    


    
@csrf_exempt
def webauthn_check_in(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        member = Member.objects.get(athlete_id=athlete_id)
        if not member.biometric_registered:
            return JsonResponse({'error': 'Fingerprint not registered'}, status=400)
        # Mark attendance for today
        from datetime import date
        from django.utils import timezone
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            member=member,
            date=today,
            defaults={
                'check_in_time': timezone.now(),
                'verification_method': 'Biometric'
            }
        )
        if not created:
            return JsonResponse({'message': 'Already checked in today'}, status=200)
        
        # Send notification to member
        if created:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            try:
                # Save to database
                notification = Notification.objects.create(
                    user=member.user,
                    message=f"Welcome back, {member.first_name}! Checked in at {get_afghanistan_time(attendance.check_in_time).strftime('%I:%M %p')}"
                )
                
                # Send real-time notification
                channel_layer = get_channel_layer()
                notification_data = {
                    "id": notification.id,
                    "message": notification.message,
                    "created_at": notification.created_at.isoformat(),
                    "is_read": notification.is_read,
                    "link": "/member-dashboard/attendance"
                }
                async_to_sync(channel_layer.group_send)(
                    f"user_{member.user.id}_notifications",
                    {
                        "type": "send_notification",
                        "notification": notification_data
                    }
                )
            except Exception as e:
                print(f"Failed to send check-in notification: {e}")
        
        return JsonResponse({'message': 'Check-in successful'})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def attendance_history(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'GET method required'}, status=405)
    
    try:
        date = request.GET.get('date')
        member_id = request.GET.get('member_id')
        today_only = request.GET.get('today_only') == 'true'
        
        qs = Attendance.objects.all().select_related('member').order_by('-date', '-check_in_time')
        
        # Apply date filters
        if today_only:
            from datetime import date as date_class
            today = date_class.today()
            qs = qs.filter(date=today)
        elif date:
            try:
                from datetime import datetime
                filter_date = datetime.strptime(date, '%Y-%m-%d').date()
                qs = qs.filter(date=filter_date)
            except ValueError:
                return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
        
        # If member_id is provided, filter to that member
        if member_id:
            try:
                from apps.Member.models import Member
                member = Member.objects.get(athlete_id=member_id)
                qs = qs.filter(member=member)
            except Member.DoesNotExist:
                return JsonResponse({'error': 'Member not found'}, status=404)
        
        # Build response data
        data = []
        for attendance in qs:
            try:
                # Check if attendance has a photo
                has_photo = hasattr(attendance, 'photo')
                photo_url = None
                if has_photo:
                    try:
                        photo_url = attendance.photo.photo.url
                    except:
                        has_photo = False
                
                data.append({
                    'id': attendance.id,
                    'member_id': attendance.member.athlete_id,
                    'member_name': f"{attendance.member.first_name} {attendance.member.last_name}",
                    'date': attendance.date.strftime('%Y-%m-%d'),
                    'check_in_time': attendance.check_in_time.isoformat() if attendance.check_in_time else None,
                    'check_in_datetime': attendance.check_in_time.isoformat() if attendance.check_in_time else None,
                    'verification_method': attendance.verification_method or 'Manual',
                    'has_photo': bool(has_photo),
                    'photo_url': str(photo_url) if photo_url else None
                })
            except Exception as record_error:
                print(f"Error processing attendance record {attendance.id}: {record_error}")
                continue
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        print(f"Error in attendance_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

# Kiosk-specific endpoints for automatic check-in
@csrf_exempt
def kiosk_authentication_options(request):
    """
    Provides WebAuthn options for kiosk authentication.
    This allows any registered fingerprint to authenticate.
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)
    
    try:
        # Generate a challenge for authentication
        challenge = base64.urlsafe_b64encode(b'kiosk-challenge-' + str(timezone.now().timestamp()).encode()).decode('utf-8')
        
        # Get all registered credentials (for any member to authenticate)
        credentials = []
        for member in Member.objects.filter(biometric_registered=True):
            if member.biometric_hash:
                credentials.append({
                    'type': 'public-key',
                    'id': member.biometric_hash,
                })
        
        options = {
            'challenge': challenge,
            # Completely omit allowCredentials for true discoverable credentials
            'userVerification': 'discouraged',  # Use 'discouraged' for silent authentication
            'timeout': 60000,  # 60 seconds for more time
        }
        
        return JsonResponse({'options': options})
        
    except Exception as e:
        print(f"Kiosk auth options error: {e}")
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def kiosk_checkin(request):
    """
    Handles kiosk check-in by identifying the member from WebAuthn assertion
    and automatically checking them in.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        assertion = data.get('assertion')
        
        print(f"Received kiosk check-in request: {data}")
        
        if not assertion:
            return JsonResponse({'error': 'Missing assertion data'}, status=400)
        
        # For kiosk mode, we'll use a simplified approach:
        # Match the credential ID to find the member
        credential_id = assertion.get('rawId') or assertion.get('id')
        
        print(f"Looking for credential ID: {credential_id}")
        
        if not credential_id:
            return JsonResponse({'error': 'Missing credential ID'}, status=400)
        
        # ENHANCED MEMBER DETECTION using biometric matching
        from .biometric_utils import BiometricSecurity
        
        print(f"Searching for member with credential ID: {credential_id}")
        
        # For WebAuthn kiosk mode, we need to identify the member from the credential
        # The credential_id should match the stored biometric_hash
        member = None
        
        # Get all registered members for debugging
        all_biometric_members = Member.objects.filter(biometric_registered=True).exclude(biometric_hash__isnull=True)
        print(f"Available biometric members: {[(m.athlete_id, m.first_name, m.biometric_hash[:20] + '...' if m.biometric_hash else 'None') for m in all_biometric_members]}")
        
        # Try exact match first
        try:
            member = Member.objects.get(biometric_hash=credential_id, biometric_registered=True)
            print(f"✅ Exact match found: {member.first_name} {member.last_name} (ID: {member.athlete_id})")
        except Member.DoesNotExist:
            # For kiosk mode, the credential ID from WebAuthn should be the rawId
            # Let's also try matching with the rawId field from the assertion
            raw_id = assertion.get('rawId')
            if raw_id and raw_id != credential_id:
                try:
                    member = Member.objects.get(biometric_hash=raw_id, biometric_registered=True)
                    print(f"✅ RawId match found: {member.first_name} {member.last_name}")
                except Member.DoesNotExist:
                    pass
            
            # If still no match, try the credential id from the assertion
            if not member:
                cred_id = assertion.get('id')
                if cred_id and cred_id != credential_id:
                    try:
                        member = Member.objects.get(biometric_hash=cred_id, biometric_registered=True)
                        print(f"✅ Credential ID match found: {member.first_name} {member.last_name}")
                    except Member.DoesNotExist:
                        pass
            
            # If still no exact match, try enhanced biometric matching
            if not member:
                member = BiometricSecurity.find_member_by_biometric(credential_id)
                
            if not member:
                return JsonResponse({
                    'error': 'Fingerprint not recognized. Please ensure your fingerprint is properly registered.',
                    'error_code': 'BIOMETRIC_NOT_FOUND',
                    'debug_info': {
                        'credential_id': credential_id,
                        'raw_id': assertion.get('rawId'),
                        'assertion_id': assertion.get('id'),
                        'available_members': len(all_biometric_members)
                    }
                }, status=404)
        
        # Check if already checked in today
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            member=member,
            date=today,
            defaults={
                'check_in_time': timezone.now(),
                'verification_method': 'Biometric-Kiosk'
            }
        )

        print(f"Check-in {'created' if created else 'already existed'} for {member.first_name}")

        # Send notification to member
        if created:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            try:
                # Save to database
                notification = Notification.objects.create(
                    user=member.user,
                    message=f"Welcome back, {member.first_name}! Checked in at {get_afghanistan_time(attendance.check_in_time).strftime('%I:%M %p')}"
                )
                
                # Send real-time notification
                channel_layer = get_channel_layer()
                notification_data = {
                    "id": notification.id,
                    "message": notification.message,
                    "created_at": notification.created_at.isoformat(),
                    "is_read": notification.is_read,
                    "link": "/member-dashboard/attendance"
                }
                async_to_sync(channel_layer.group_send)(
                    f"user_{member.user.id}_notifications",
                    {
                        "type": "send_notification",
                        "notification": notification_data
                    }
                )
            except Exception as e:
                print(f"Failed to send check-in notification: {e}")

        return JsonResponse({
            'success': True,
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'first_name': member.first_name,
                'last_name': member.last_name,
            },
            'already_checked_in': not created,
            'check_in_time': get_afghanistan_time(attendance.check_in_time).isoformat() if attendance.check_in_time else None,
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Kiosk check-in error: {e}")
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def set_member_pin(request):
    """Set or update member PIN with reference photo"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        pin = data.get('pin')
        photo_data = data.get('photo')
        enable_pin = data.get('enable_pin', True)
        
        if not athlete_id or not pin:
            return JsonResponse({'error': 'athlete_id and pin are required'}, status=400)
            
        if not photo_data:
            return JsonResponse({'error': 'Reference photo is required for PIN setup'}, status=400)
        
        if len(pin) < 4 or len(pin) > 6 or not pin.isdigit():
            return JsonResponse({'error': 'PIN must be 4-6 digits'}, status=400)
        
        try:
            member = Member.objects.get(athlete_id=athlete_id)
        except Member.DoesNotExist:
            return JsonResponse({'error': 'Member not found'}, status=404)
        
        # Check if member already has a PIN set (prevent multiple registrations)
        if member.pin and member.pin_enabled:
            return JsonResponse({
                'error': 'PIN already registered for this member. Contact admin to reset.',
                'error_code': 'PIN_ALREADY_SET'
            }, status=400)
        
        # Check if PIN is already used by another member
        existing_pin = Member.objects.filter(pin=pin).exclude(athlete_id=athlete_id).first()
        if existing_pin:
            return JsonResponse({
                'error': 'PIN already used by someone else',
                'error_code': 'PIN_ALREADY_EXISTS'
            }, status=400)
        
        # Save reference photo
        if photo_data.startswith('data:image/'):
            format, imgstr = photo_data.split(';base64,')
            ext = 'jpg'
        else:
            imgstr = photo_data
            ext = 'jpg'
        
        from django.core.files.base import ContentFile
        import uuid
        
        photo_file = ContentFile(
            base64.b64decode(imgstr),
            name=f'{athlete_id}_pin_ref_{uuid.uuid4().hex[:8]}.{ext}'
        )
        
        member.pin = pin
        member.pin_enabled = enable_pin
        member.pin_reference_photo = photo_file
        member.save()
        
        # Send notification to member
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            # Save to database
            notification = Notification.objects.create(
                user=member.user,
                message=f"PIN setup completed successfully for {member.first_name} {member.last_name}"
            )
            
            # Send real-time notification
            channel_layer = get_channel_layer()
            notification_data = {
                "id": notification.id,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "is_read": notification.is_read,
                "link": "/member-dashboard/attendance"
            }
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user.id}_notifications",
                {
                    "type": "send_notification",
                    "notification": notification_data
                }
            )
        except Exception as e:
            print(f"Failed to send PIN setup notification: {e}")
        
        return JsonResponse({
            'success': True,
            'message': f'PIN and reference photo saved for {member.first_name} {member.last_name}',
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'pin_enabled': member.pin_enabled
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Set PIN error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def check_member_pin(request):
    """Check if member has PIN and reference photo"""
    if request.method != 'GET':
        return JsonResponse({'error': 'GET required'}, status=405)
    
    try:
        athlete_id = request.GET.get('athlete_id')
        if not athlete_id:
            return JsonResponse({'error': 'athlete_id is required'}, status=400)
        
        try:
            member = Member.objects.get(athlete_id=athlete_id)
        except Member.DoesNotExist:
            return JsonResponse({'error': 'Member not found'}, status=404)
        
        return JsonResponse({
            'athlete_id': member.athlete_id,
            'name': f"{member.first_name} {member.last_name}",
            'has_pin': bool(member.pin),
            'pin_enabled': member.pin_enabled,
            'has_reference_photo': bool(member.pin_reference_photo),
            'reference_photo_url': member.pin_reference_photo.url if member.pin_reference_photo else None
        })
        
    except Exception as e:
        print(f"Check PIN error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def reset_member_pin(request):
    """Reset member PIN (admin only)"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        
        if not athlete_id:
            return JsonResponse({'error': 'athlete_id is required'}, status=400)
        
        try:
            member = Member.objects.get(athlete_id=athlete_id)
        except Member.DoesNotExist:
            return JsonResponse({'error': 'Member not found'}, status=404)
        
        # Reset PIN
        member.pin = None
        member.pin_enabled = False
        member.save()
        
        return JsonResponse({
            'success': True,
            'message': f'PIN reset for {member.first_name} {member.last_name}',
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'pin_enabled': False
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Reset PIN error: {e}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def external_sensor_checkin(request):
    """
    Handle check-in from external USB fingerprint sensors
    Bypasses Windows Hello/WebAuthn completely
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        data = json.loads(request.body)
        fingerprint_data = data.get('fingerprint_data')
        sensor_type = data.get('sensor_type', 'unknown')
        quality = data.get('quality', 'unknown')
        
        print(f"External sensor check-in: sensor={sensor_type}, quality={quality}")
        
        if not fingerprint_data:
            return JsonResponse({'error': 'Fingerprint data required'}, status=400)
        
        # Enhanced member detection using biometric matching
        from .biometric_utils import BiometricSecurity
        
        # Convert external sensor fingerprint data to our internal format
        # This may need adjustment based on the specific sensor SDK format
        if isinstance(fingerprint_data, dict):
            # Extract the actual fingerprint template/hash
            biometric_hash = fingerprint_data.get('template') or fingerprint_data.get('hash') or str(fingerprint_data)
        else:
            biometric_hash = str(fingerprint_data)
        
        print(f"Processing biometric hash: {biometric_hash[:20]}...")
        
        # Find member by biometric hash
        member = None
        
        # Try exact match first
        try:
            member = Member.objects.get(biometric_hash=biometric_hash, biometric_registered=True)
            print(f"✅ Exact match found: {member.first_name} {member.last_name}")
        except Member.DoesNotExist:
            # Try enhanced matching
            member = BiometricSecurity.find_member_by_biometric(biometric_hash)
            
            if not member:
                # For external sensors, we might need to try different matching algorithms
                # depending on the sensor type
                member = BiometricSecurity.enhanced_biometric_search(biometric_hash, sensor_type)
        
        if not member:
            return JsonResponse({
                'error': 'Fingerprint not recognized. Please ensure your fingerprint is registered.',
                'error_code': 'EXTERNAL_SENSOR_NOT_RECOGNIZED',
                'sensor_type': sensor_type,
                'debug_info': {
                    'biometric_hash': biometric_hash[:20] + '...',
                    'total_registered_members': Member.objects.filter(biometric_registered=True).count()
                }
            }, status=404)
        
        # Check if already checked in today
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            member=member,
            date=today,
            defaults={
                'check_in_time': timezone.now(),
                'verification_method': f'External-{sensor_type}'
            }
        )
        
        print(f"External sensor check-in {'created' if created else 'already existed'} for {member.first_name}")
        
        # Send notification to member
        if created:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            try:
                notification = Notification.objects.create(
                    user=member.user,
                    message=f"Welcome back, {member.first_name}! Checked in via external sensor at {get_afghanistan_time(attendance.check_in_time).strftime('%I:%M %p')}"
                )
                
                channel_layer = get_channel_layer()
                notification_data = {
                    "id": notification.id,
                    "message": notification.message,
                    "created_at": notification.created_at.isoformat(),
                    "is_read": notification.is_read,
                    "link": "/member-dashboard/attendance"
                }
                async_to_sync(channel_layer.group_send)(
                    f"user_{member.user.id}_notifications",
                    {
                        "type": "send_notification",
                        "notification": notification_data
                    }
                )
            except Exception as e:
                print(f"Failed to send external sensor check-in notification: {e}")
        
        return JsonResponse({
            'success': True,
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'first_name': member.first_name,
                'last_name': member.last_name,
            },
            'already_checked_in': not created,
            'check_in_time': get_afghanistan_time(attendance.check_in_time).isoformat() if attendance.check_in_time else None,
            'sensor_info': {
                'type': sensor_type,
                'quality': quality
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"External sensor check-in error: {e}")
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def debug_attendance(request):
    """Debug endpoint to check attendance data"""
    try:
        from datetime import date as date_class
        today = date_class.today()
        
        total_count = Attendance.objects.count()
        today_count = Attendance.objects.filter(date=today).count()
        
        # Get sample records
        sample_records = list(Attendance.objects.all()[:3].values())
        
        return JsonResponse({
            'total_attendance_records': total_count,
            'today_attendance_records': today_count,
            'today_date': str(today),
            'sample_records': sample_records,
            'request_params': dict(request.GET),
        }, json_dumps_params={'indent': 2})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def pin_checkin(request):
    """Handle PIN-based check-in with photo verification"""
    print(f"PIN check-in request received: {request.method}")
    
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    
    try:
        print(f"Processing PIN check-in request body: {request.body[:100]}...")
        from django.core.cache import cache
        from django.core.files.base import ContentFile
        import uuid
        
        data = json.loads(request.body)
        print(f"JSON parsed successfully: {list(data.keys())}")
        pin = data.get('pin')
        photo_data = data.get('photo')
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        print(f"PIN: {pin}, Photo data length: {len(photo_data) if photo_data else 0}")
        
        if not pin:
            return JsonResponse({'error': 'PIN is required'}, status=400)
        
        # We'll check time after finding the member
        
        # Rate limiting
        attempts_key = f'pin_attempts_{ip}'
        attempts = cache.get(attempts_key, 0)
        if attempts >= 5:
            return JsonResponse({
                'error': 'Too many failed attempts. Please try again in 5 minutes.',
                'error_code': 'RATE_LIMITED'
            }, status=429)
        
        try:
            member = Member.objects.get(pin=pin, pin_enabled=True)
        except Member.DoesNotExist:
            # Increment failed attempts
            cache.set(attempts_key, attempts + 1, 300)  # 5 min timeout
            return JsonResponse({
                'error': 'Invalid PIN or PIN not enabled',
                'error_code': 'INVALID_PIN'
            }, status=400)
        
        # Photo is required for PIN verification
        if not photo_data:
            return JsonResponse({
                'error': 'Photo required for PIN verification',
                'error_code': 'PHOTO_REQUIRED'
            }, status=400)
        
        # Check if member has reference photo
        if not member.pin_reference_photo:
            return JsonResponse({
                'error': 'No reference photo found. Please contact admin to set up PIN with photo.',
                'error_code': 'NO_REFERENCE_PHOTO'
            }, status=400)
        
        # Compare photos using face recognition
        from .face_utils_simple import FaceComparison
        
        print(f"Comparing photos for {member.first_name}")
        
        try:
            # Validate current photo has a face
            print(f"Validating photo for {member.first_name}...")
            is_valid, validation_error = FaceComparison.validate_face_photo(photo_data)
            print(f"Photo validation result: valid={is_valid}, error={validation_error}")
            
            if not is_valid:
                return JsonResponse({
                    'error': f'Photo validation failed: {validation_error}',
                    'error_code': 'INVALID_PHOTO'
                }, status=400)
            
            # Compare with reference photo
            print(f"Comparing with reference photo: {member.pin_reference_photo.path}")
            is_match, confidence, comparison_error = FaceComparison.compare_faces(
                member.pin_reference_photo.path, 
                photo_data,
                tolerance=0.3
            )
            
            print(f"Comparison result: match={is_match}, confidence={confidence:.2f}, error={comparison_error}")
            
            if comparison_error:
                return JsonResponse({
                    'error': f'Face comparison failed: {comparison_error}',
                    'error_code': 'COMPARISON_ERROR'
                }, status=500)
            
            if not is_match:
                print(f"Face mismatch for {member.first_name}: confidence={confidence:.2f}")
                return JsonResponse({
                    'error': f'PIN+Photo verification failed. Face does not match (confidence: {confidence:.2f})',
                    'error_code': 'FACE_MISMATCH',
                    'confidence': float(round(confidence, 2))
                }, status=403)
            
            print(f"Face match successful for {member.first_name}: confidence={confidence:.2f}")
            
        except Exception as face_error:
            print(f"Face comparison exception: {face_error}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Face comparison system error: {str(face_error)}',
                'error_code': 'SYSTEM_ERROR'
            }, status=500)
        
        # Check if already checked in today
        today = date.today()
        attendance, created = Attendance.objects.get_or_create(
            member=member,
            date=today,
            defaults={
                'check_in_time': timezone.now(),
                'verification_method': 'PIN+Photo'
            }
        )
        
        # Send notification to member
        if created:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            from apps.Notifications.models import Notification
            
            try:
                # Save to database
                notification = Notification.objects.create(
                    user=member.user,
                    message=f"Welcome back, {member.first_name}! Checked in at {get_afghanistan_time(attendance.check_in_time).strftime('%I:%M %p')}"
                )
                
                # Send real-time notification
                channel_layer = get_channel_layer()
                notification_data = {
                    "id": notification.id,
                    "message": notification.message,
                    "created_at": notification.created_at.isoformat(),
                    "is_read": notification.is_read,
                    "link": "/member-dashboard/attendance"
                }
                async_to_sync(channel_layer.group_send)(
                    f"user_{member.user.id}_notifications",
                    {
                        "type": "send_notification",
                        "notification": notification_data
                    }
                )
            except Exception as e:
                print(f"Failed to send check-in notification: {e}")
        
        # Save photo if provided
        if created and photo_data:
            try:
                if photo_data.startswith('data:image/'):
                    format, imgstr = photo_data.split(';base64,')
                    ext = 'jpg'
                else:
                    imgstr = photo_data
                    ext = 'jpg'
                
                photo_file = ContentFile(
                    base64.b64decode(imgstr),
                    name=f'{member.athlete_id}_{uuid.uuid4().hex[:8]}.{ext}'
                )
                
                CheckInPhoto.objects.create(
                    attendance=attendance,
                    photo=photo_file
                )
                
                print(f"Photo saved for {member.first_name} {member.last_name}")
                
            except Exception as photo_error:
                print(f"Photo save failed: {photo_error}")
                import traceback
                traceback.print_exc()

        
        # Reset attempts on success
        cache.delete(attempts_key)
        
        return JsonResponse({
            'success': True,
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'first_name': member.first_name,
                'last_name': member.last_name,
            },
            'already_checked_in': not created,
            'check_in_time': get_afghanistan_time(attendance.check_in_time).isoformat(),
            'verification_method': 'PIN+Photo'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"PIN check-in error: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def today_stats(request):
    """Public endpoint for kiosk stats - no authentication required"""
    if request.method != 'GET':
        return JsonResponse({'error': 'GET method required'}, status=405)
    
    try:
        from datetime import date as date_class
        from apps.Member.models import Member
        
        today = date_class.today()
        
        # Get today's attendance count
        today_count = Attendance.objects.filter(date=today).count()
        
        # Get total members count
        total_members = Member.objects.count()
        
        return JsonResponse({
            'todayCount': today_count,
            'totalMembers': total_members,
            'date': str(today)
        })
        
    except Exception as e:
        print(f"🚨 Error in today_stats: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def checkin_photos(request):
    """Get recent check-in photos for admin review"""
    if request.method != 'GET':
        return JsonResponse({'error': 'GET method required'}, status=405)
    
    try:
        from .models import CheckInPhoto
        from datetime import date as date_class, timedelta
        
        # Get date range (default: last 7 days)
        days = int(request.GET.get('days', 7))
        start_date = date_class.today() - timedelta(days=days)
        
        # Get photos with attendance info
        photos = CheckInPhoto.objects.filter(
            attendance__date__gte=start_date
        ).select_related('attendance__member').order_by('-created_at')
        
        data = []
        for photo in photos:
            data.append({
                'id': photo.id,
                'member_id': photo.attendance.member.athlete_id,
                'member_name': f"{photo.attendance.member.first_name} {photo.attendance.member.last_name}",
                'date': photo.attendance.date.strftime('%Y-%m-%d'),
                'check_in_time': photo.attendance.check_in_time.isoformat(),
                'verification_method': photo.attendance.verification_method,
                'photo_url': photo.photo.url if photo.photo else None,
                'created_at': photo.created_at.isoformat()
            })
        
        return JsonResponse({
            'photos': data,
            'total_count': len(data),
            'date_range': f"{start_date} to {date_class.today()}"
        })
        
    except Exception as e:
        print(f"Error in checkin_photos: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def delete_checkin_photo(request, photo_id):
    """Delete a check-in photo"""
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE method required'}, status=405)
    
    try:
        from .models import CheckInPhoto
        import os
        
        photo = CheckInPhoto.objects.get(id=photo_id)
        
        # Delete the actual file
        if photo.photo and os.path.exists(photo.photo.path):
            os.remove(photo.photo.path)
        
        # Delete the database record
        photo.delete()
        
        return JsonResponse({'success': True, 'message': 'Photo deleted successfully'})
        
    except CheckInPhoto.DoesNotExist:
        return JsonResponse({'error': 'Photo not found'}, status=404)
    except Exception as e:
        print(f"Error deleting photo: {e}")
        return JsonResponse({'error': str(e)}, status=500)


