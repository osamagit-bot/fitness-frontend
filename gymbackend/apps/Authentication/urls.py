from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.urls import path,include
from . import views
from .views import AdminDashboardViewSet
from rest_framework.routers import DefaultRouter
from .views import AuthTestViewSet
from .views import CustomTokenRefreshView

router = DefaultRouter()

router.register(r'admin-dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'auth-test', AuthTestViewSet, basename='auth-test')


urlpatterns = [
    
    
    path('', include(router.urls)),
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    
   
    path('test/', views.test_view, name='test-view'),
    path('debug-urls/', views.debug_urls, name='debug-urls'),


    # CSRF token endpoint
    path('csrf/', views.get_csrf_token, name='get_csrf'),
]
