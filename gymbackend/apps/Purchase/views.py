from django.shortcuts import render
from rest_framework import viewsets, permissions, status, generics
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from apps.Member.models import Member
from .models import Product,Purchase
from .serializers import ProductSerializer,PurchaseSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = [JWTAuthentication, TokenAuthentication, SessionAuthentication]
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            # Allow anyone to view products (for shopping)
            permission_classes = [permissions.AllowAny]
        else:
            # Only admins can create, update, delete products
            permission_classes = [permissions.IsAdminUser]
        
        return [permission() for permission in permission_classes]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        try:
            product_name = response.data.get("name", "Unknown Product")
            # Product creation notification handled by service layer
            from Notifications.services import notification_service
            notification_service.create_notification(f"Product added successfully: {product_name}")
        except Exception as e:
            print(f"Failed to create product notification: {e}")
        return response

class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Allow admin users to access all actions, regular users need to be authenticated
        """
        if self.request.user.is_staff or self.request.user.is_superuser:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        print(f"🔍 User: {self.request.user}")
        print(f"🔍 Is staff: {self.request.user.is_staff}")
        
        # Allow admin to see all purchases
        if self.request.user.is_staff or self.request.user.is_superuser:
            print("✅ Admin user - returning all purchases")
            return Purchase.objects.all()
        
        # Regular users see only their purchases through member relationship
        try:
            member = Member.objects.get(user=self.request.user)
            print(f"✅ Found member: {member}")
            return Purchase.objects.filter(member=member)
        except Member.DoesNotExist:
            print("❌ No member found for user")
            return Purchase.objects.none()

    def perform_create(self, serializer):
        purchase = serializer.save()

        product_name = purchase.product.name
        total_price = purchase.total_price

        # Product purchase notification handled by service layer
        from Notifications.services import notification_service
        notification_service.create_notification(f"{product_name} sold for {total_price:.2f} AFN")
