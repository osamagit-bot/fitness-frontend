from django.db import models
from apps.Member.models import Member
from django.utils.translation import gettext_lazy as _
import os

def checkin_photo_path(instance, filename):
    """Generate path for check-in photos"""
    return f'checkin_photos/{instance.attendance.date}/{instance.attendance.member.athlete_id}_{filename}'

class Attendance(models.Model):
    member = models.ForeignKey(
        Member, 
        on_delete=models.CASCADE, 
        related_name='attendances',
        verbose_name=_('Member')
    )
    date = models.DateField(
        verbose_name=_('Date'),
        help_text=_('Date of attendance')
    )
    check_in_time = models.DateTimeField(
        verbose_name=_('Check-in Time'),
        help_text=_('Time when member checked in')
    )
    verification_method = models.CharField(
        max_length=20,
        default='Biometric',
        verbose_name=_('Verification Method'),
        help_text=_('Method used to verify attendance')
    )

    class Meta:
        app_label = 'Attendance'
        unique_together = ('member', 'date')  # One check-in per day per member
        verbose_name = _('Attendance')
        verbose_name_plural = _('Attendances')
        ordering = ['-date', '-check_in_time']
        
    def __str__(self):
        return f"{self.member.first_name} {self.member.last_name} - {self.date}"
    
    @property
    def formatted_time(self):
        """Return the check-in time formatted as 12-hour with AM/PM"""
        if self.check_in_time:
            return self.check_in_time.strftime('%I:%M:%S %p')
        return "N/A"

class CheckInPhoto(models.Model):
    """Store photos taken during PIN check-in for security verification
    
    Note: Images will be deleted automatically after 24 hours
    """
    attendance = models.OneToOneField(
        Attendance,
        on_delete=models.CASCADE,
        related_name='photo',
        verbose_name=_('Attendance')
    )
    photo = models.ImageField(
        upload_to=checkin_photo_path,
        verbose_name=_('Check-in Photo'),
        help_text=_('Photo taken during check-in for security verification. Auto-deleted after 24 hours.')
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Created At')
    )
    
    class Meta:
        app_label = 'Attendance'
        verbose_name = _('Check-in Photo')
        verbose_name_plural = _('Check-in Photos')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Photo for {self.attendance.member.first_name} {self.attendance.member.last_name} - {self.attendance.date}"

