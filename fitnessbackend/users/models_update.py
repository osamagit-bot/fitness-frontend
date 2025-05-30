# users/models_update.py

from django.db import models
from django.utils import timezone
from .models import Member

class Attendance(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendances')
    check_in_time = models.DateTimeField(auto_now_add=True)
    date = models.DateField(auto_now_add=True)
    
    class Meta:
        unique_together = ('member', 'date')  # Only one attendance record per member per day
        ordering = ['-date', '-check_in_time']
        
    def __str__(self):
        return f"{self.member.user.username} - {self.date}"