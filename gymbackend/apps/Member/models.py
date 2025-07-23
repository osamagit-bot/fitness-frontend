from django.conf import settings
from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractUser, Group, Permission
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth.models import User


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

    biometric_hash = models.CharField(max_length=255, null=True, blank=True, unique=True)
    biometric_registered = models.BooleanField(default=False)

    
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
     return f"{self.first_name} {self.last_name}" + (" (Inactive)" if not self.is_active else "")





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
