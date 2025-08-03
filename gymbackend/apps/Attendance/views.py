from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from dateutil.parser import parse as parse_date
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Attendance
from .serializers import AttendanceSerializer

def send_member_notification(member, message):
    """Send real-time notification to member and save to database"""
    try:
        # Save to database
        from apps.Notifications.models import Notification
        notification = Notification.objects.create(
            user=member.user,
            message=message
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
        print(f"Failed to send notification: {e}")


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    
    def create(self, request, *args, **kwargs):
        """Override create to add notifications for check-in"""
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            attendance = Attendance.objects.get(id=response.data['id'])
            if attendance.check_in_time:
                send_member_notification(
                    attendance.member, 
                    f"Checked in successfully at {attendance.check_in_time.strftime('%I:%M %p')}"
                )
        return response
    
    def update(self, request, *args, **kwargs):
        """Override update to add notifications for check-out"""
        instance = self.get_object()
        old_checkout = instance.check_out_time
        response = super().update(request, *args, **kwargs)
        
        if response.status_code == 200:
            instance.refresh_from_db()
            if not old_checkout and instance.check_out_time:
                send_member_notification(
                    instance.member,
                    f"Checked out successfully at {instance.check_out_time.strftime('%I:%M %p')}"
                )
        return response

    @action(detail=False, methods=["post"])
    def checkin(self, request):
        """Manual check-in endpoint"""
        try:
            from apps.Member.models import Member
            member_id = request.data.get('member_id')
            member = Member.objects.get(athlete_id=member_id)
            
            attendance, created = Attendance.objects.get_or_create(
                member=member,
                date=date.today(),
                defaults={'check_in_time': timezone.now()}
            )
            
            if not created and not attendance.check_in_time:
                attendance.check_in_time = timezone.now()
                attendance.save()
            
            send_member_notification(
                member,
                f"Welcome back, {member.first_name}! Checked in at {attendance.check_in_time.strftime('%I:%M %p')}"
            )
            
            return Response({"message": "Check-in successful", "time": attendance.check_in_time})
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=404)
    
    @action(detail=False, methods=["post"])
    def checkout(self, request):
        """Manual check-out endpoint"""
        try:
            from apps.Member.models import Member
            member_id = request.data.get('member_id')
            member = Member.objects.get(athlete_id=member_id)
            
            attendance = Attendance.objects.filter(
                member=member,
                date=date.today(),
                check_in_time__isnull=False
            ).first()
            
            if not attendance:
                return Response({"error": "No check-in record found for today"}, status=400)
            
            attendance.check_out_time = timezone.now()
            attendance.save()
            
            send_member_notification(
                member,
                f"Great workout, {member.first_name}! Checked out at {attendance.check_out_time.strftime('%I:%M %p')}"
            )
            
            return Response({"message": "Check-out successful", "time": attendance.check_out_time})
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=404)
    
    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """Get attendance history for a specific member"""
        today_only = request.query_params.get("today_only") == "true"
        
        try:
            # Verify the member exists
            from apps.Member.models import Member
            member = Member.objects.get(athlete_id=pk)
            
            # SECURITY: Check if user is requesting their own data or is admin
            if not (request.user.is_staff or 
                    request.user.is_superuser or 
                    (hasattr(request.user, 'member') and request.user.member == member)):
                return Response({"error": "Permission denied"}, status=403)
            
            if today_only:
                data = Attendance.objects.filter(member=member, date=date.today())
            else:
                data = Attendance.objects.filter(member=member)

            serializer = self.get_serializer(data, many=True)
            return Response(serializer.data)
            
        except Member.DoesNotExist:
            return Response({"error": "Member not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["get"], url_path="history")
    def attendance_history_by_date(self, request):
        date_str = request.query_params.get("date")
        if not date_str:
            return Response({"error": "Missing 'date' parameter"}, status=400)

        parsed_date = parse_date(date_str)
        if not parsed_date:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        records = Attendance.objects.filter(date=parsed_date)
        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)
