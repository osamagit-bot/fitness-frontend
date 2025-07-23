from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, Group, Permission
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from apps.Member.models import Member




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
    
    # Add notification preferences
    email_notifications = models.BooleanField(default=True, verbose_name=_('Email Notifications'))
    whatsapp_notifications = models.BooleanField(default=False, verbose_name=_('WhatsApp Notifications'))
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = CustomUserManager()
    
    class Meta:
        app_label = 'Authentication'
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.email
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"



