import base64
import traceback
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date
from apps.Member.models import Member
from apps.Authentication.models import WebAuthnCredential
from apps.Attendance.models import Attendance

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
        # Notification is handled by signals.py - no need to call here
        return JsonResponse({'message': 'Check-in successful'})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def attendance_history(request):
    print(f"🔍 Attendance history request: {request.method}")
    print(f"🔍 Query params: {request.GET}")
    
    if request.method != 'GET':
        return JsonResponse({'error': 'GET method required'}, status=405)
    
    try:
        date = request.GET.get('date')
        member_id = request.GET.get('member_id')
        today_only = request.GET.get('today_only') == 'true'
        
        qs = Attendance.objects.all().select_related('member').order_by('-date', '-check_in_time')
        
        # SECURITY: If member_id is provided, only show that member's records
        if member_id:
            try:
                from apps.Member.models import Member
                member = Member.objects.get(athlete_id=member_id)
                qs = qs.filter(member=member)
                print(f"🔒 Filtered to member: {member.first_name} {member.last_name}")
            except Member.DoesNotExist:
                return JsonResponse({'error': 'Member not found'}, status=404)
        
        # Apply date filters
        if today_only:
            from datetime import date as date_class
            today = date_class.today()
            qs = qs.filter(date=today)
            print(f"🔍 Filtered to today: {today}")
        elif date:
            qs = qs.filter(date=date)
            print(f"🔍 Filtered to date: {date}")
        
        # Build response data with member stats
        data = []
        for attendance in qs:
            # Calculate member's total attendance and absent days
            member_total_attendance = Attendance.objects.filter(member=attendance.member).count()
            
            data.append({
                'id': attendance.id,
                'member_id': attendance.member.athlete_id,
                'member_name': f"{attendance.member.first_name} {attendance.member.last_name}",
                'date': attendance.date.strftime('%Y-%m-%d'),
                'check_in_time': attendance.check_in_time.isoformat(),  # Full datetime format
                'verification_method': attendance.verification_method,
                'member_start_date': attendance.member.start_date.strftime('%Y-%m-%d') if attendance.member.start_date else None,
                'member_total_attendance': member_total_attendance,
                # Add member object for compatibility
                'member': {
                    'first_name': attendance.member.first_name,
                    'last_name': attendance.member.last_name,
                    'athlete_id': attendance.member.athlete_id
                }
            })
        
        print(f"✅ Returning {len(data)} attendance records")
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        print(f"🚨 Error in attendance_history: {str(e)}")
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
            'allowCredentials': credentials,
            'userVerification': 'required',
            'timeout': 30000,  # 30 seconds
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

        # Notification is handled by signals.py - no need to call here

        return JsonResponse({
            'success': True,
            'member': {
                'athlete_id': member.athlete_id,
                'name': f"{member.first_name} {member.last_name}",
                'first_name': member.first_name,
                'last_name': member.last_name,
            },
            'already_checked_in': not created,
            'check_in_time': attendance.check_in_time.isoformat() if attendance.check_in_time else None,
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Kiosk check-in error: {e}")
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










