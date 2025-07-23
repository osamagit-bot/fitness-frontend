
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.Authentication.views import home, health_check

urlpatterns = [
    path('', home, name='home'),
    path('health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/', include('apps.Authentication.urls')),
    path('api/', include('apps.Member.urls')),
    path('api/', include('apps.Community.urls')),
    path('api/', include('apps.Purchase.urls')),
    path('api/', include('apps.Attendance.urls')),
    path('api/', include('apps.Notifications.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
