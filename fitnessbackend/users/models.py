from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractUser, Group, Permission
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth.models import User
from django.conf import settings
import uuid






class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)

        if self.model.objects.filter(email=email).exists():
            raise ValueError(f"Email '{email}' is already in use.")
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
    
    

class CustomUser(AbstractUser):
    class Role(models.TextChoices):
        MEMBER = 'member', _('Member')
        TRAINER = 'trainer', _('Trainer')
        ADMIN = 'admin', _('Admin')
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.MEMBER,
        verbose_name=_('User Role')
    )
    
    email = models.EmailField(
        unique=True,
        verbose_name=_('Email Address'),
        error_messages={
            'unique': _("A user with that email already exists."),
        }
    )
    
    username = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        unique=True,
        validators=[MinLengthValidator(4)],
        verbose_name=_('Username'),
        help_text=_('Optional. 4-150 characters.')
    )
    
    first_name = models.CharField(
        max_length=150,
        verbose_name=_('First Name'),
        help_text=_('Required. 150 characters or fewer.')
    )
    
    last_name = models.CharField(
        max_length=150,
        verbose_name=_('Last Name'),
        help_text=_('Required. 150 characters or fewer.')
    )
    
    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        related_name="customuser_set",
        related_query_name="user",
    )
    
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('user permissions'),
        blank=True,
        related_name="customuser_set",
        related_query_name="user",
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = CustomUserManager()
    
    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"



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
        CustomUser, 
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
    biometric_data = models.TextField(
    null=True, 
    blank=True,
    verbose_name=_('Biometric Data'),
    help_text=_('Base64 encoded biometric template')
)
    biometric_registered = models.BooleanField(
    default=False,
    verbose_name=_('Biometric Registered'),
    help_text=_('Whether member has registered their biometrics')
)
    biometric_data = models.TextField(null=True, blank=True)
    biometric_hash = models.CharField(max_length=255, null=True, blank=True)
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
        verbose_name = _('Member')
        verbose_name_plural = _('Members')
        ordering = ['-start_date']

    def __str__(self):
     return f"{self.first_name} {self.last_name}" + (" (Inactive)" if not self.is_active else "")




class Product(models.Model):
    product_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='product_images/', null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - ${self.price}"
    
    @property
    def image_url(self):
        if self.image:
            return self.image.url
        return None
    




class Trainer(models.Model):
    SPECIALIZATION_CHOICES = [
        ('fitness', 'Fitness'),
        ('yoga', 'Yoga'),
        ('cardio', 'Cardio'),
        ('strength', 'Strength Training'),
        ('nutrition', 'Nutrition'),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='trainer_profile')
    trainer_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2)
    specialization = models.CharField(max_length=20, choices=SPECIALIZATION_CHOICES, default='fitness')
    # Adding a default date to avoid migration issues
    start_date = models.DateField(default="2023-06-20")
    
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
    
    def __str__(self):
        return f"{self.get_type_display()} with {self.trainer.first_name} ({self.datetime.strftime('%Y-%m-%d %H:%M')})"
    



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





class WebAuthnCredential(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='webauthn_credentials')
    credential_id = models.CharField(max_length=255)
    public_key = models.TextField()
    sign_count = models.PositiveIntegerField(default=0)
    rp_id = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('member', 'credential_id')
        
    def __str__(self):
        return f"WebAuthn credential for {self.member}"
    




class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    date_created = models.DateTimeField(auto_now_add=True)  
    hidden = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_posts', blank=True)  
    def __str__(self):
        return self.title
    
class Comment(models.Model):
    post = models.ForeignKey('Post', related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='comments', on_delete=models.CASCADE)  # or your Member model
    content = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"

# Announcement 
class Announcement(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)  
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, default='1', related_name='announcements')

    def __str__(self):
        return self.title
    
    
    

    
"""

class Community(models.Model):
    name = models.CharField(max_length=100)
"""


# Challenge model 
class Challenge(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_challenges')
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='challenges', blank=True)
    date_created = models.DateTimeField(auto_now_add=True)  # Add this!

    def __str__(self):
        return self.title
    
    
    
    
# New ChallengeParticipant model
class ChallengeParticipant(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('challenge', 'member')

    def __str__(self):
        return f"{self.member.first_name} joined {self.challenge.title}"
    
    

# The Comment model 
class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"

# Support ticket model 
class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('closed', 'Closed'),
    )
    
    TYPE_CHOICES = (
        ('general', 'General Inquiry'),
        ('technical', 'Technical Issue'),
        ('billing', 'Billing Question'),
        ('feedback', 'Feedback'),
        ('complaint', 'Complaint'),
    )
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='support_tickets')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Ticket #{self.id}: {self.subject}"

# Support ticket 
class TicketResponse(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='responses')
    responder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_responses')
    message = models.TextField()
    date_created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Response to ticket #{self.ticket.id}"

# FAQ Category model 
class FAQCategory(models.Model):
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "FAQ Categories"

# FAQ model 
class FAQ(models.Model):
    category = models.ForeignKey(FAQCategory, on_delete=models.CASCADE, related_name='faqs')
    question = models.CharField(max_length=255)
    answer = models.TextField()
    
    def __str__(self):
        return self.question
    
class Purchase(models.Model):
    member = models.ForeignKey(Member, on_delete=models.SET_NULL,null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.member} bought {self.quantity} x {self.product.name} on {self.date.strftime('%Y-%m-%d %H:%M')}"
    
class Notification(models.Model):
    user = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
  
  
  
  
  
  
class TrainingSchedule(models.Model):
    member = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='training_schedule')
    monday = models.TextField(blank=True, default='')
    tuesday = models.TextField(blank=True, default='')
    wednesday = models.TextField(blank=True, default='')
    thursday = models.TextField(blank=True, default='')
    friday = models.TextField(blank=True, default='')
    saturday = models.TextField(blank=True, default='')
    sunday = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.member}'s Training Schedule"
    
    
    
    
    
    
    
    