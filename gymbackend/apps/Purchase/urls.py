

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .views import ProductViewSet,PurchaseViewSet
from . import payments_views


router = DefaultRouter()

router.register(r'products', ProductViewSet, basename='product')
router.register(r'purchases', PurchaseViewSet, basename='purchase')


urlpatterns = [
    path('', include(router.urls)),
    path('payments/hisab-pay/', payments_views.hisab_pay, name='hisab_pay'),
    path('payments/hisab-pay/callback/', payments_views.hisab_pay_callback, name='hisab_pay_callback'),
]
