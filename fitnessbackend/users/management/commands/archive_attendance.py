from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import Attendance, AttendanceHistory  # Adjust the import path as needed
from datetime import timedelta

class Command(BaseCommand):
    help = 'Archive completed attendance records from previous days'

    def handle(self, *args, **options):
        yesterday = timezone.now().date() - timedelta(days=1)
        
        # Get all completed records from before today
        # Modified to check for check_out_time instead of status field
        old_records = Attendance.objects.filter(
            date__lt=timezone.now().date(),
        ).exclude(check_out_time=None)
        
        self.stdout.write(f"Found {old_records.count()} records to archive")
        
        # Move them to history
        count = 0
        for record in old_records:
            AttendanceHistory.objects.create(
                athlete_id=getattr(record, 'athlete_id', record.member.athlete_id if hasattr(record, 'member') else ''),
                member_name=getattr(record, 'member_name', f"{record.member.first_name} {record.member.last_name}" if hasattr(record, 'member') else ''),
                box_number=getattr(record, 'box_number', record.member.box_number if hasattr(record, 'member') else None),
                time_slot=getattr(record, 'time_slot', record.member.time_slot if hasattr(record, 'member') else None),
                date=record.date,
                check_in_time=record.check_in_time,
                check_out_time=record.check_out_time,
                duration=getattr(record, 'duration', None),
                status='completed'
            )
            count += 1
        
        # Delete the original records
        old_records.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully archived {count} attendance records')
        )