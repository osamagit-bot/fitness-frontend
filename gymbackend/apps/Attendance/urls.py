from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import biometric_views

router = DefaultRouter()
router.register(r'attendance', views.AttendanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Public endpoints for kiosk (no authentication required)
    path('attendance_history/', biometric_views.attendance_history, name='public-attendance-history'),
    path('today_stats/', biometric_views.today_stats, name='public-today-stats'),
    
    # Biometric endpoints
    path('webauthn/register/options/', biometric_views.webauthn_register_options, name='webauthn-register-options'),
    path('webauthn/register/complete/', biometric_views.webauthn_register_complete, name='webauthn-register-complete'),
    path('webauthn/checkin/', biometric_views.webauthn_check_in, name='webauthn-checkin'),
    path('webauthn/kiosk/options/', biometric_views.kiosk_authentication_options, name='kiosk-auth-options'),
    path('webauthn/kiosk/checkin/', biometric_views.kiosk_checkin, name='kiosk-checkin'),
    path('webauthn/kiosk/external-sensor/', biometric_views.external_sensor_checkin, name='external-sensor-checkin'),
    
    # PIN endpoints
    path('pin/checkin/', biometric_views.pin_checkin, name='pin-checkin'),
    path('pin/set/', biometric_views.set_member_pin, name='set-member-pin'),
    path('pin/check/', biometric_views.check_member_pin, name='check-member-pin'),
    path('pin/reset/', biometric_views.reset_member_pin, name='reset-member-pin'),
    
    # Debug endpoints
    path('debug/', biometric_views.debug_attendance, name='debug-attendance'),
    
    # Photo review endpoints
    path('checkin_photos/', biometric_views.checkin_photos, name='checkin-photos'),
    path('checkin_photos/<int:photo_id>/delete/', biometric_views.delete_checkin_photo, name='delete-checkin-photo'),
]
