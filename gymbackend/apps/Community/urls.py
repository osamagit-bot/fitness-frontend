
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import SupportViewSet, PostViewSet, CommunityViewSet, CommentViewSet, AdminCommunityViewSet, AdminSupportViewSet

router = DefaultRouter()

router.register(r'support', SupportViewSet, basename='support')

router.register(r'community/posts', PostViewSet, basename='community-posts')

router.register(r'community', CommunityViewSet, basename='community')

router.register(r'faq-categories', SupportViewSet, basename='faq-category')  
router.register(r'admin-community', AdminCommunityViewSet, basename='admin-community')
router.register(r'admin-support', AdminSupportViewSet, basename='admin-support')

posts_router = NestedDefaultRouter(router, r'community/posts', lookup='post')
posts_router.register(r'comments', CommentViewSet, basename='post-comments')


urlpatterns = [
     path('', include(router.urls)),
     path('', include(posts_router.urls)),
]