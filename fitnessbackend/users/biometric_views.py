import base64
import traceback
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import date
from .models import Member, WebAuthnCredential, Attendance

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
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        biometric_hash = data.get('biometric_hash')
        credential_response = data.get('credential_response', {})

        print(f"Registration attempt for athlete_id: {athlete_id}")
        print(f"Biometric hash: {biometric_hash[:50]}...")  # Log partial hash for debugging

        # Check if the member exists
        member = get_object_or_404(Member, athlete_id=athlete_id)

        # Check if this exact biometric hash is already registered to another member
        existing_member = Member.objects.filter(
            biometric_hash=biometric_hash, 
            biometric_registered=True
        ).exclude(athlete_id=athlete_id).first()
        
        if existing_member:
            print(f"SECURITY ALERT: Attempt to register duplicate fingerprint!")
            return JsonResponse({
                'status': 'error', 
                'message': f'This fingerprint is already registered to another member.'
            }, status=400)

        # If no existing member found, register the new biometric hash
        member.biometric_hash = biometric_hash
        member.biometric_registered = True
        member.save()
        
        print(f"✅ Fingerprint successfully registered for {member.user.first_name} {member.user.last_name}")
        return JsonResponse({'status': 'ok'})
        
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
        return JsonResponse({'message': 'Check-in successful'})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)
    
@csrf_exempt
def attendance_history(request):
    try:
        member_id = request.GET.get('member_id')
        date = request.GET.get('date')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        limit = request.GET.get('limit')
        qs = Attendance.objects.all().select_related('member').order_by('-check_in_time')
        if member_id:
            qs = qs.filter(member__athlete_id=member_id)
        if date:
            qs = qs.filter(date=date)
        elif start_date and end_date:
            qs = qs.filter(date__range=[start_date, end_date])
        
        # Apply limit if specified
        if limit:
            try:
                qs = qs[:int(limit)]
            except ValueError:
                pass  # Ignore invalid limit values
        
        records = []
        for record in qs:
            member_name = "Unknown"
            if record.member:
                member_name = f"{record.member.first_name} {record.member.last_name}"
            
            records.append({
                "id": record.id,
                "member_id": getattr(record.member, 'athlete_id', None) or getattr(record.member, 'id', None),
                "member_name": member_name,
                "date": record.date,
                "check_in_time": record.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if record.check_in_time else "",
                "verification_method": getattr(record, 'verification_method', 'Biometric'),
            })
        return JsonResponse(records, safe=False)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
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
        
        # Find member by biometric hash (credential ID)
        # List all members with biometric data for debugging
        all_biometric_members = Member.objects.filter(biometric_registered=True)
        print(f"Members with biometrics: {[(m.athlete_id, m.first_name, m.biometric_hash) for m in all_biometric_members]}")
        
        try:
            member = Member.objects.get(biometric_hash=credential_id, biometric_registered=True)
            print(f"Found member: {member.first_name} {member.last_name} (ID: {member.athlete_id})")
        except Member.DoesNotExist:
            print(f"No member found with credential ID: {credential_id}")
            # Try partial matching or different credential formats
            for m in all_biometric_members:
                if m.biometric_hash and (credential_id in m.biometric_hash or m.biometric_hash in credential_id):
                    print(f"Found partial match: {m.first_name} {m.last_name}")
                    member = m
                    break
            else:
                return JsonResponse({'error': 'Fingerprint not recognized'}, status=404)
        
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