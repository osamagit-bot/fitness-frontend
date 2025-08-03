from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import os
from apps.Attendance.models import CheckInPhoto

class Command(BaseCommand):
    help = 'Delete check-in photos older than 24 hours'

    def handle(self, *args, **options):
        # Calculate 24 hours ago
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        # Find photos older than 24 hours
        old_photos = CheckInPhoto.objects.filter(created_at__lt=cutoff_time)
        
        deleted_count = 0
        for photo in old_photos:
            try:
                # Delete the actual file
                if photo.photo and os.path.exists(photo.photo.path):
                    os.remove(photo.photo.path)
                
                # Delete the database record
                photo.delete()
                deleted_count += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error deleting photo {photo.id}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {deleted_count} old check-in photos')
        )