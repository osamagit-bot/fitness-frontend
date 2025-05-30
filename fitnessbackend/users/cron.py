from users.models import Attendance, AttendanceHistory
from django.utils import timezone
from datetime import timedelta

def archive_attendance():
    """Archive completed attendance records from previous days"""
    yesterday = timezone.now().date() - timedelta(days=1)
    
    # Get all completed records from before today
    old_records = Attendance.objects.filter(
        date__lt=timezone.now().date(),
        status='completed'
    ).exclude(check_out_time=None)
    
    # Move them to history
    count = 0
    for record in old_records:
        AttendanceHistory.objects.create(
            athlete_id=record.athlete_id,
            member_name=record.member_name,
            box_number=record.box_number,
            time_slot=record.time_slot,
            date=record.date,
            check_in_time=record.check_in_time,
            check_out_time=record.check_out_time,
            duration=record.duration,
            status='completed'
        )
        count += 1
    
    # Delete the original records
    old_records.delete()
    
    print(f'Successfully archived {count} attendance records')
    return f'Archived {count} records'