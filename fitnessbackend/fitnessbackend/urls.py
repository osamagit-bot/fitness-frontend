
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from users.views import Home

from rest_framework_simplejwt.views import TokenRefreshView




urlpatterns = [
    path('', Home, name='home'),
      path('grappelli/', include('grappelli.urls')), 
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),

    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    
    
]

# Add this to serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = "Gym Management System"
admin.site.site_title = "Gym Admin Portal"
admin.site.index_title = "Welcome to Gym Management"