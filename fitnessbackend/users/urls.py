from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from . import views
from .views import (
    NotificationViewSet, AuthTestViewSet, MemberViewSet, TrainerViewSet,
    AdminDashboardViewSet, CommunityViewSet, SupportViewSet,
    AdminCommunityViewSet, AdminSupportViewSet, ProductViewSet,
    TrainingViewSet, PurchaseViewSet, AttendanceViewSet, PostViewSet,
    CommentViewSet
)

from rest_framework_simplejwt.views import TokenRefreshView
from . import payments_views
from .api.notifications_views import MemberNotificationsView
from .biometric_views import (
    webauthn_register_options, webauthn_register_complete, 
    webauthn_check_in, attendance_history, kiosk_authentication_options, kiosk_checkin
)

# Main router
router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'trainings', TrainingViewSet, basename='training')
router.register(r'trainers', TrainerViewSet, basename='trainers')
router.register(r'purchases', PurchaseViewSet, basename='purchase')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'auth-test', AuthTestViewSet, basename='auth-test')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'support', SupportViewSet, basename='support')

# Register PostViewSet as the parent for nesting
router.register(r'community/posts', PostViewSet, basename='community-posts')

# Keep CommunityViewSet if it has other actions not covered by PostViewSet
router.register(r'community', CommunityViewSet, basename='community')

router.register(r'faq-categories', SupportViewSet, basename='faq-category')  
router.register(r'admin-community', AdminCommunityViewSet, basename='admin-community')
router.register(r'admin-support', AdminSupportViewSet, basename='admin-support')
router.register(r'admin-dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'admin-trainers', TrainerViewSet, basename='admin-trainers')
router.register(r'admin-members', MemberViewSet, basename='admin-member')

# Nested router for comments under posts
# The first argument to NestedDefaultRouter should be the main router.
# The second argument should be the base_url_path of the parent resource, which is 'community/posts'.
# The lookup argument should match the lookup_field of the parent PostViewSet, which is 'pk' by default.
posts_router = NestedDefaultRouter(router, r'community/posts', lookup='post')
posts_router.register(r'comments', CommentViewSet, basename='post-comments')

urlpatterns = [
  
    path('', include(router.urls)),
    path('', include(posts_router.urls)),

    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    
   
    path('test/', views.test_view, name='test-view'),
    path('debug-urls/', views.debug_urls, name='debug-urls'),

    # CSRF token endpoint
    path('csrf/', views.get_csrf_token, name='get_csrf'),

    # Payments endpoint
    path('payments/hisab-pay/', payments_views.hisab_pay, name='hisab_pay'),

    # Member notifications
    path('member/notifications/', MemberNotificationsView.as_view(), name='member-notifications'),
    
    # WebAuthn/Biometric endpoints
    path('webauthn/register/options/', webauthn_register_options, name='webauthn-register-options'),
    path('webauthn/register/complete/', webauthn_register_complete, name='webauthn-register-complete'),
    path('webauthn/check_in/', webauthn_check_in, name='webauthn-check-in'),
    path('attendance_history/', attendance_history, name='attendance-history'),
    
    # Kiosk endpoints
    path('webauthn/kiosk/options/', kiosk_authentication_options, name='kiosk-auth-options'),
    path('webauthn/kiosk/checkin/', kiosk_checkin, name='kiosk-checkin'),
]

