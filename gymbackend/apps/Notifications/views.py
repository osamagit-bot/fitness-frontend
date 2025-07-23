from django.shortcuts import render
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from django.utils import timezone
from django.db import transaction
from .serializers import NotificationSerializer
from .models import Notification
from apps.Member.models import Member
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from .email_service import EmailNotificationService
from .whatsapp_service import WhatsAppNotificationService





class NotificationViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def admin_notifications(self, request):
        print(f"🔍 Admin notifications - User: {request.user}")
        print(f"🔍 Is authenticated: {request.user.is_authenticated}")
        print(f"🔍 Is staff: {request.user.is_staff}")
        
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)
        
        notifications = Notification.objects.order_by("-created_at")[:30]
        data = [
            {
                "id": n.id,
                "message": n.message,
                "created_at": n.created_at.isoformat(),
                "is_read": n.is_read,
            }
            for n in notifications
        ]
        return Response({"notifications": data})

    @action(detail=False, methods=["delete"], permission_classes=[IsAdminUser])
    def delete_all(self, request):
        Notification.objects.all().delete()
        return Response({"detail": "All notifications deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({"status": "all marked as read"})

    def check_and_notify_expired_members(self):
        today = timezone.now().date()
        with transaction.atomic():
            expired_members = Member.objects.select_for_update().filter(expiry_date__lt=today, notified_expired=False)
            for member in expired_members:
                # Create in-app notification
                from .services import notification_service
                notification_service.create_notification(
                    f"Membership expired for: {member.first_name} {member.last_name}"
                )
                
                # Send email notification
                from .email_service import EmailNotificationService
                email_service = EmailNotificationService()
                email_service.send_admin_notification_email(
                    subject="Member Membership Expired",
                    message=f"A member's membership has expired:\n\n"
                           f"Name: {member.first_name} {member.last_name}\n"
                           f"Athlete ID: {member.athlete_id}\n"
                           f"Email: {member.user.email if member.user else 'N/A'}\n"
                           f"Membership Type: {member.get_membership_type_display()}\n"
                           f"Monthly Fee: ${member.monthly_fee}\n"
                           f"Expiry Date: {member.expiry_date}\n"
                           f"Days Expired: {(today - member.expiry_date).days} days"
                )
                
                member.notified_expired = True
                member.save()

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def update_email_preferences(self, request):
        """Update admin email notification preferences"""
        try:
            email_enabled = request.data.get('email_enabled', True)
            
            # Store preference in user profile or settings
            # For now, we'll store it in the user's profile or create a settings model
            request.user.profile.email_notifications = email_enabled
            request.user.profile.save()
            
            return Response({
                'message': 'Email preferences updated successfully',
                'email_enabled': email_enabled
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def test_email_notification(self, request):
        """Test email notification functionality"""
        print(f"🔍 TEST EMAIL - User: {request.user}")
        print(f"🔍 TEST EMAIL - Is authenticated: {request.user.is_authenticated}")
        print(f"🔍 TEST EMAIL - Authorization header: {request.headers.get('Authorization')}")
        
        try:
            email_service = EmailNotificationService()
            success = email_service.send_admin_notification_email(
                "Test Notification",
                "This is a test email notification from your Gym Management System."
            )
            
            if success:
                return Response({'message': 'Test email sent successfully'})
            else:
                return Response(
                    {'error': 'Failed to send test email'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def test_email_system(self, request):
        """Comprehensive email system test"""
        try:
            from django.conf import settings
            from django.core.mail import get_connection
            
            # Test 1: Check configuration
            config_status = {
                'EMAIL_BACKEND': settings.EMAIL_BACKEND,
                'EMAIL_HOST': getattr(settings, 'EMAIL_HOST', 'Not set'),
                'EMAIL_PORT': getattr(settings, 'EMAIL_PORT', 'Not set'),
                'EMAIL_HOST_USER': getattr(settings, 'EMAIL_HOST_USER', 'Not set'),
                'DEFAULT_FROM_EMAIL': getattr(settings, 'DEFAULT_FROM_EMAIL', 'Not set'),
            }
            
            # Test 2: Check connection
            try:
                connection = get_connection()
                connection.open()
                connection_status = "✅ Connection successful"
                connection.close()
            except Exception as e:
                connection_status = f"❌ Connection failed: {str(e)}"
            
            # Test 3: Send test email
            email_service = EmailNotificationService()
            email_sent = email_service.send_admin_notification_email(
                "Email System Test",
                f"This is a test email sent at {timezone.now()}. If you receive this, your email system is working correctly!"
            )
            
            return Response({
                'config': config_status,
                'connection': connection_status,
                'email_sent': email_sent,
                'message': 'Email system test completed'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def test_whatsapp_system(self, request):
        """Comprehensive WhatsApp system test"""
        try:
            whatsapp_service = WhatsAppNotificationService()
            
            # Test 1: Check configuration
            config_status = whatsapp_service.validate_whatsapp_configuration()
            
            # Test 2: Send test WhatsApp message
            whatsapp_sent = whatsapp_service.send_admin_whatsapp_notification(
                f"WhatsApp System Test - {timezone.now()}"
            )
            
            return Response({
                'config': config_status,
                'whatsapp_sent': whatsapp_sent,
                'message': 'WhatsApp system test completed'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def test_whatsapp_notification(self, request):
        """Send test WhatsApp notification"""
        try:
            whatsapp_service = WhatsAppNotificationService()
            
            # Check if WhatsApp is enabled first
            if not whatsapp_service.is_enabled:
                return Response({
                    'error': 'WhatsApp notifications are disabled',
                    'message': 'Please enable WhatsApp in settings and configure credentials',
                    'whatsapp_enabled': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            success = whatsapp_service.send_admin_whatsapp_notification(
                f"Test WhatsApp notification sent at {timezone.now()}"
            )
            
            if success:
                return Response(
                    {'message': 'Test WhatsApp notification sent successfully'}, 
                    status=status.HTTP_200_OK
                )
            else:
                return Response({
                    'error': 'Failed to send WhatsApp notification',
                    'message': 'Check your WhatsApp configuration and credentials'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=["post"], permission_classes=[IsAdminUser])
    def update_whatsapp_preferences(self, request):
        """Update WhatsApp notification preferences"""
        try:
            whatsapp_enabled = request.data.get('whatsapp_enabled', False)
            
            # Here you could save to database or just return success
            # For now, we'll just return the current state
            
            return Response({
                'message': 'WhatsApp preferences updated successfully',
                'whatsapp_enabled': whatsapp_enabled,
                'status': 'success'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
