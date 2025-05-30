import base64
import traceback
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Member, WebAuthnCredential, Attendance

@csrf_exempt
def webauthn_register_options(request):
    import json
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        member = get_object_or_404(Member, athlete_id=athlete_id)
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
    import json
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        data = json.loads(request.body)
        athlete_id = data.get('athlete_id')
        biometric_hash = data.get('biometric_hash')  # or whatever field you use for uniqueness
        member = get_object_or_404(Member, athlete_id=athlete_id)

        # Check if this biometric_hash is already registered to another member
        if biometric_hash:
            duplicate = Member.objects.filter(biometric_hash=biometric_hash).exclude(athlete_id=athlete_id).exists()
            if duplicate:
                return JsonResponse({'status': 'error', 'message': 'This fingerprint is already registered to another member.'}, status=400)
            member.biometric_hash = biometric_hash

        member.biometric_registered = True
        member.save()
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
        qs = Attendance.objects.all().select_related('member')
        if member_id:
            qs = qs.filter(member__athlete_id=member_id)
        if date:
            qs = qs.filter(date=date)
        elif start_date and end_date:
            qs = qs.filter(date__range=[start_date, end_date])
        records = []
        for record in qs:
            records.append({
                "id": record.id,
                "member_id": getattr(record.member, 'athlete_id', None) or getattr(record.member, 'id', None),
                "date": record.date,
                "check_in_time": record.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if record.check_in_time else "",
                "verification_method": getattr(record, 'verification_method', 'Biometric'),
            })
        return JsonResponse(records, safe=False)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)