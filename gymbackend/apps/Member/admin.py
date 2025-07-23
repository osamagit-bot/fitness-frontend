from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from .models import Member
from apps.Purchase.models import Purchase,Product
from apps.Authentication.models import CustomUser
from django.utils.translation import gettext_lazy as _
from django import forms




class MemberForm(forms.ModelForm):
    class Meta:
        model = Member
        fields = '__all__'
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'expiry_date': forms.DateInput(attrs={'type': 'date'}),
        }

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'full_name', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal Info'), {'fields': ('first_name', 'last_name')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'role', 
                      'groups', 'user_permissions'),
        }),
        (_('Important Dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 
                      'role', 'is_staff', 'is_active'),
        }),
    )
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions',)

    def delete_model(self, request, obj):
        if hasattr(obj, 'member'):
            obj.member.delete()
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        for user in queryset:
            if hasattr(user, 'member'):
                user.member.delete()
        super().delete_queryset(request, queryset)

class MemberAdmin(admin.ModelAdmin):
    form = MemberForm
    list_display = ('athlete_id', 'first_name', 'last_name', 'membership_type', 
                   'monthly_fee', 'box_number', 'time_slot', 'start_date', 'expiry_date', 'user_status')
    list_filter = ('membership_type', 'time_slot')
    search_fields = ('athlete_id', 'first_name', 'last_name', 'user__email', 'box_number')
    fieldsets = (
        (None, {
            'fields': ('user', 'athlete_id', 'first_name', 'last_name')
        }),
        (_('Membership Information'), {
            'fields': ('membership_type', 'monthly_fee', 'start_date', 'expiry_date')
        }),
        (_('Facility Information'), {
            'fields': ('box_number', 'time_slot')
        }),
    )
    
    def user_status(self, obj):
        return obj.user.is_active
    user_status.boolean = True
    user_status.short_description = _('User Active')

    def user_full_name(self, obj):
        return obj.user.full_name
    user_full_name.short_description = _('Full Name')
    user_full_name.admin_order_field = 'user__first_name'

    def is_active(self, obj):
        return obj.user.is_active
    is_active.boolean = True
    is_active.short_description = _('Active')
    
    

# New ProductAdmin class
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'price', 'description')
        }),
        (_('Image'), {
            'fields': ('image',)
        }),
    )

class PurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'member', 'product', 'quantity', 'total_price', 'date')
    list_filter = ('member', 'product')
    search_fields = ('member__user__email', 'product__name')
    



    
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Member, MemberAdmin)

admin.site.register(Purchase, PurchaseAdmin) 


# Added Product model registration
admin.site.register(Product, ProductAdmin)