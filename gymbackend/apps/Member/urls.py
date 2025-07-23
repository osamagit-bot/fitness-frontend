from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import MemberViewSet,TrainerViewSet,TrainingViewSet


router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'trainers', TrainerViewSet, basename='trainers')
router.register(r'trainings', TrainingViewSet, basename='trainings')


urlpatterns = [
     path('', include(router.urls)),
]