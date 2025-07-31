from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StockInViewSet, StockOutViewSet

router = DefaultRouter()
router.register(r'stockin', StockInViewSet, basename='stockin')
router.register(r'stockout', StockOutViewSet, basename='stockout')

urlpatterns = [
    path('', include(router.urls)),
]