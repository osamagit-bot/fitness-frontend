from django.contrib import admin
from django.utils.html import format_html
from .models import Attendance, CheckInPhoto

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['member', 'date', 'check_in_time', 'verification_method', 'has_photo']
    list_filter = ['date', 'verification_method']
    search_fields = ['member__first_name', 'member__last_name', 'member__athlete_id']
    readonly_fields = ['check_in_time']
    
    def has_photo(self, obj):
        return hasattr(obj, 'photo')
    has_photo.boolean = True
    has_photo.short_description = 'Photo'

@admin.register(CheckInPhoto)
class CheckInPhotoAdmin(admin.ModelAdmin):
    list_display = ['attendance', 'member_name', 'date', 'photo_preview', 'created_at']
    list_filter = ['created_at', 'attendance__date']
    search_fields = ['attendance__member__first_name', 'attendance__member__last_name']
    readonly_fields = ['photo_preview', 'created_at']
    
    def member_name(self, obj):
        return f"{obj.attendance.member.first_name} {obj.attendance.member.last_name}"
    member_name.short_description = 'Member'
    
    def date(self, obj):
        return obj.attendance.date
    date.short_description = 'Check-in Date'
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 200px;" />',
                obj.photo.url
            )
        return "No photo"
    photo_preview.short_description = 'Photo Preview'
