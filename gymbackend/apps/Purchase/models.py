from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.conf import settings
import uuid
from django.contrib.auth.models import BaseUserManager, AbstractUser, Group, Permission
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _
from apps.Member.models import Member


# Create your models here.

    
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
    
    
class Purchase(models.Model):
    member = models.ForeignKey(Member, on_delete=models.SET_NULL,null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='purchases')
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.member} bought {self.quantity} x {self.product.name} on {self.date.strftime('%Y-%m-%d %H:%M')}"

