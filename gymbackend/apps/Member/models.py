from django.conf import settings
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractUser, Group, Permission
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth.models import User
from decimal import Decimal

import uuid

# models.py

class MembershipPayment(models.Model):
    member = models.ForeignKey('Member', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    member_name = models.CharField(max_length=255, null=True) 
    paid_on = models.DateField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)
    

    def __str__(self):
        if self.member:
            return f"{self.member} paid {self.amount} on {self.paid_on}"
        return f"Deleted Member paid {self.amount} on {self.paid_on}"



class Member(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        primary_key=True,
        verbose_name=_('User Account'),
    )
    is_active = models.BooleanField(default=True)
    athlete_id = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_('Athlete ID'),
        help_text=_('Unique identifier for the athlete')
    )

    # Legacy field - keep for backward compatibility
    biometric_hash = models.CharField(max_length=255, null=True, blank=True)
    biometric_registered = models.BooleanField(default=False)
    
    # New biometric fields for proper duplicate detection
    biometric_templates = models.JSONField(default=list, blank=True, help_text="Stores multiple biometric templates for comparison")
    biometric_quality_threshold = models.FloatField(default=0.8, help_text="Minimum quality score for biometric matching")
    last_biometric_update = models.DateTimeField(null=True, blank=True)
    
    # PIN authentication field
    pin = models.CharField(max_length=6, unique=True, null=True, blank=True, help_text="4-6 digit PIN for check-in")
    pin_enabled = models.BooleanField(default=False, help_text="Enable PIN-based check-in for this member")
    pin_reference_photo = models.ImageField(upload_to='pin_photos/', null=True, blank=True, help_text="Reference photo for PIN verification")

    
    first_name = models.CharField(
        max_length=150,
        verbose_name=_('First Name'),
        help_text=_('Athlete first name'),
        default='John'
    )
    last_name = models.CharField(
        max_length=150,
        verbose_name=_('Last Name'),
        help_text=_('Athlete last name'),
        default='Doe'
    )
    monthly_fee = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name=_('Monthly Fee'),
        help_text=_('Monthly membership fee in local currency')
    )
    
    MEMBERSHIP_TYPES = [
        ('fitness', _('Fitness')),
        ('gym', _('Gym')),
    ]
    
    membership_type = models.CharField(
        max_length=10,
        choices=MEMBERSHIP_TYPES,
        default='fitness',
        verbose_name=_('Membership Type')
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('Phone Number'),
        help_text=_('Member phone number')
    )
    start_date = models.DateField(
        verbose_name=_('Start Date'),
        help_text=_('Date when membership begins')
    )
    
    expiry_date = models.DateField(
        verbose_name=_('Expiry Date'),
        help_text=_('Date when membership expires')
    )
    
   
    box_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_('Box Number'),
        help_text=_('Locker or box number assigned to member')
    )
    
    TIME_SLOT_CHOICES = [
        ('morning', _('Morning')),
        ('afternoon', _('Afternoon')),
        ('evening', _('Evening')),
    ]
    
    time_slot = models.CharField(
        max_length=10,
        choices=TIME_SLOT_CHOICES,
        default='morning',
        verbose_name=_('Time Slot'),
        help_text=_('Preferred workout time')
    )
    notified_expired = models.BooleanField(default=False)  
    delete_requested = models.BooleanField(default=False)

    class Meta:
        app_label = 'Member'
        verbose_name = _('Member')
        verbose_name_plural = _('Members')
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.first_name} {self.last_name} (ID: {self.athlete_id})"
    
    @property
    def user_status(self):
        """Check if member has valid user relationship"""
        if hasattr(self, 'user') and self.user:
            return f"User: {self.user.username} (Active: {self.user.is_active})"
        return "No user relationship"





class Trainer(models.Model):
    SPECIALIZATION_CHOICES = [
        ('fitness', 'Fitness'),
        ('yoga', 'Yoga'),
        ('cardio', 'Cardio'),
        ('strength', 'Strength Training'),
        ('nutrition', 'Nutrition'),
    ]
    
    # Remove user field completely
    trainer_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    specialization = models.CharField(max_length=100, choices=SPECIALIZATION_CHOICES, default='fitness')
    start_date = models.DateField()
    image = models.ImageField(upload_to='trainer_images/', blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.trainer_id})"





class Training(models.Model):
    TRAINING_TYPES = [
        ('fitness', 'Fitness'),
        ('yoga', 'Yoga'),
        ('cardio', 'Cardio'),
        ('strength', 'Strength Training'),
        ('nutrition', 'Nutrition'),
    ]
    
    trainer = models.ForeignKey(Trainer, on_delete=models.CASCADE, related_name='trainings')
    type = models.CharField(max_length=20, choices=TRAINING_TYPES)
    datetime = models.DateTimeField()
    duration = models.IntegerField(help_text="Duration in minutes")
    capacity = models.IntegerField(default=10)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='training_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_type_display()} with {self.trainer.first_name} ({self.datetime.strftime('%Y-%m-%d %H:%M')})"


class MembershipRevenue(models.Model):
    """Track cumulative membership revenue to prevent resets when members are deleted"""
    month = models.DateField()  # First day of the month
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    member_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['month']
    
    @classmethod
    def add_member_revenue(cls, member_fee, member_id=None):
        """Add revenue when a new member joins (pays for current month)"""
        from datetime import datetime
        
        current_month = datetime.now().replace(day=1).date()
        
        # Get or create revenue record for current month
        revenue_record, created = cls.objects.get_or_create(
            month=current_month,
            defaults={
                'total_revenue': Decimal('0'),
                'member_count': 0
            }
        )
        
        # Add the new member's fee to total revenue
        old_revenue = revenue_record.total_revenue
        revenue_record.total_revenue += Decimal(str(member_fee))
        revenue_record.member_count += 1
        revenue_record.save()
        
        print(f"✅ Revenue tracking: {old_revenue} + {member_fee} = {revenue_record.total_revenue} AFN (Member: {member_id})")
        
        return revenue_record.total_revenue
    
    @classmethod
    def update_current_month_revenue(cls):
        """Get current month revenue (for compatibility with existing code)"""
        from datetime import datetime
        
        current_month = datetime.now().replace(day=1).date()
        
        # Get or create revenue record for current month
        revenue_record, created = cls.objects.get_or_create(
            month=current_month,
            defaults={
                'total_revenue': Decimal('0'),
                'member_count': 0
            }
        )
        
        # Revenue only increases through add_member_revenue calls, never decreases
        return revenue_record.total_revenue
    
    @classmethod
    def remove_member_revenue(cls, member_fee):
        """DO NOT remove revenue when members are deleted - revenue should never decrease"""
        # This method intentionally does nothing to prevent revenue from decreasing
        # when members are deleted. Revenue represents money actually received.
        print(f"⚠️ Revenue removal blocked: {member_fee} AFN (revenue never decreases)")
        return cls.get_current_month_revenue()
    
    @classmethod
    def get_current_month_revenue(cls):
        """Get persistent revenue for current month"""
        from datetime import datetime
        
        current_month = datetime.now().replace(day=1).date()
        
        try:
            revenue_record = cls.objects.get(month=current_month)
            return revenue_record.total_revenue
        except cls.DoesNotExist:
            return cls.update_current_month_revenue()