from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from . import views
from .views import (
    NotificationViewSet, AuthTestViewSet, MemberViewSet, TrainerViewSet,
    AdminDashboardViewSet, CommunityViewSet, SupportViewSet,
    AdminCommunityViewSet, AdminSupportViewSet, ProductViewSet,
    TrainingViewSet, PurchaseViewSet, AttendanceViewSet, PostViewSet,
    CommentViewSet,test_jwt_view  # Make sure you import CommentViewSet here
)

from rest_framework_simplejwt.views import TokenRefreshView
from . import payments_views
from .api.notifications_views import MemberNotificationsView

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
router.register(r'community', CommunityViewSet, basename='community')
router.register(r'community/posts', PostViewSet, basename='posts')
router.register(r'faq-categories', SupportViewSet, basename='faq-category')  
router.register(r'admin-community', AdminCommunityViewSet, basename='admin-community')
router.register(r'admin-support', AdminSupportViewSet, basename='admin-support')
router.register(r'admin-dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'admin-trainers', TrainerViewSet, basename='admin-trainers')
router.register(r'admin-members', MemberViewSet, basename='admin-member')

# Nested router for comments under posts
posts_router = NestedDefaultRouter(router, r'community/posts', lookup='post')
posts_router.register(r'comments', CommentViewSet, basename='post-comments')

urlpatterns = [
    # Include main router URLs
    path('', include(router.urls)),

    # Include nested comments URLs
    path('', include(posts_router.urls)),

    # User registration and authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    
    path('test-jwt/', test_jwt_view, name='test-jwt'),
      

    # Debug and test endpoints
    path('test/', views.test_view, name='test-view'),
    path('debug-urls/', views.debug_urls, name='debug-urls'),

    # CSRF token endpoint
    path('csrf/', views.get_csrf_token, name='get_csrf'),

    # Payments endpoint
    path('payments/hisab-pay/', payments_views.hisab_pay, name='hisab_pay'),

    # Member notifications
    path('member/notifications/', MemberNotificationsView.as_view(), name='member-notifications'),
]
