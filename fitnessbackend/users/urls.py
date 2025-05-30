from django.urls import path, include
from . import views
from . import biometric_views

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .biometric_views import (
    webauthn_register_options,
    webauthn_register_complete,
    attendance_history,
    webauthn_check_in
 
)
from . import payments_views 
# Create router for viewsets
router = DefaultRouter()
router.register(r'members', views.MemberViewSet, basename='member')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'trainings', views.TrainingViewSet, basename='training')
router.register(r'trainers', views.TrainerViewSet)

# Define regular URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # User registration and authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('admin/stats/', views.get_admin_dashboard_stats, name='admin_stats'),
    path('register-member-auth/', views.register_member_with_auth, name='register-member-auth'),
    path('register-member/', views.register_member, name='register-member'),

    # Biometric Attendance endpoints - new WebAuthn versions
    path('biometrics/register/', webauthn_register_complete, name='register_biometrics'),  # For backward compatibility
   # For backward compatibility
    
    # WebAuthn-specific endpoints
    path('biometrics/webauthn/register-options/', webauthn_register_options, name='webauthn_register_options'),
    path('biometrics/webauthn/register-complete/', webauthn_register_complete, name='webauthn_register_complete'),

     path('biometrics/check-in/', webauthn_check_in, name='webauthn_check_in'),
    
  path('attendance/history/', attendance_history, name='attendance-history'),
    
    # Attendance history endpoints
   
    # Remove 'api/' prefix from these URLs
  # Changed from api/attendance/history/


    # These should be removed or changed since they duplicate the above paths with 'api/' prefix
    # path('api/attendance/history/<str:member_id>/', attendance_history, name='api-attendance-history-with-id'),
    # path('api/attendance/member/<str:member_id>/', attendance_history, name='api-member-attendance-history'),

    # Debug and test endpoints
    path('debug/list-members/', views.list_all_members, name='list_all_members'),
    path('test/', views.test_view, name='test-view'),
    path('debug-urls/', views.debug_urls, name='debug-urls'),
    
    # CSRF token endpoints
    path('csrf/', views.get_csrf_token, name='get_csrf'),
    # Remove 'api/' prefix - this will be accessible at /api/biometrics/debug-webauthn/
   # Changed from api/biometrics/debug-webauthn/
    
    # Member, Trainer, and Admin login/profile
    path('member-login/', views.member_login, name='member-login'),
    path('member-profile/', views.get_member_profile, name='member-profile'),
    path('trainers/', views.register_trainer, name='register-trainer'),
    path('trainer-login/', views.trainer_login, name='trainer-login'),
    path('trainer-profile/', views.get_trainer_profile, name='trainer-profile'),
    path('admin-login/', views.admin_login, name='admin-login'),
    path('members/<str:member_id>/dashboard/', views.member_dashboard, name='member-dashboard'),
    path('member-details/<str:member_id>/', views.get_member_details, name='member-details'),
    path('members/<str:member_id>/profile/', views.update_member_profile, name='update-member-profile'),
    path('members/<str:member_id>/change-password/', views.change_member_password, name='change-member-password'),
       path('admin/reset-member-password/', views.reset_member_password, name='reset-member-password'),

    # Debug URLs - Remove 'api/' prefix from these as well
   # Changed from api/debug/list-urls/
   # New test endpoint

  
     path('payments/hisab-pay/', payments_views.hisab_pay, name='hisab_pay'),
   


    # Community endpoints
    path('community/posts/', views.get_community_posts, name='community_posts'),
    path('community/posts/create/', views.create_community_post, name='create_community_post'),
    path('community/posts/<int:post_id>/like/', views.like_community_post, name='like_community_post'),
    path('community/announcements/', views.get_community_announcements, name='community_announcements'),
    path('community/challenges/', views.get_community_challenges, name='community_challenges'),
    path('community/challenges/<int:challenge_id>/join/', views.join_community_challenge, name='join_community_challenge'),
    
    # Support endpoints - fixed duplications and function names
    path('support/tickets/', views.get_support_tickets, name='get_support_tickets'),
    path('support/tickets/create/', views.create_support_ticket, name='create_support_ticket'),
    path('support/faqs/', views.get_support_faqs, name='get_support_faqs'),


    # Admin Community Management URLs
path('admin/announcements/', views.get_admin_announcements),
path('admin/announcements/create/', views.create_admin_announcement),
path('admin/announcements/<int:announcement_id>/', views.delete_admin_announcement),
path('admin/challenges/', views.get_admin_challenges),
path('admin/challenges/create/', views.create_admin_challenge),
path('admin/challenges/<int:challenge_id>/', views.delete_admin_challenge),
path('admin/community-posts/', views.get_admin_community_posts),
path('admin/community-posts/<int:post_id>/hide/', views.hide_admin_community_post),

# Admin Support Management URLs
path('admin/support/tickets/', views.get_admin_support_tickets),
path('admin/support/tickets/<int:ticket_id>/respond/', views.respond_to_support_ticket),
path('admin/support/tickets/<int:ticket_id>/close/', views.close_support_ticket),
path('admin/support/faq-categories/', views.get_admin_faq_categories),
path('admin/support/faq-categories/create/', views.create_admin_faq_category),
path('admin/support/faqs/create/', views.create_admin_faq),
]