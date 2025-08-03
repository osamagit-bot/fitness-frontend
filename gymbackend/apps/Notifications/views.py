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
    permission_classes = [IsAuthenticated]
    
    def partial_update(self, request, pk=None):
        """Update individual notification (mark as read)"""
        try:
            if request.user.is_staff:
                notification = Notification.objects.get(id=pk, user__isnull=True)
            else:
                notification = Notification.objects.get(id=pk, user=request.user)
            
            is_read = request.data.get('is_read', notification.is_read)
            notification.is_read = is_read
            notification.save()
            
            return Response({'id': notification.id, 'is_read': notification.is_read})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=404)
    
    def list(self, request):
        """Get notifications for the current user (member or admin)"""
        if request.user.is_staff:
            # Admin gets only admin notifications (no user assigned)
            notifications = Notification.objects.filter(user__isnull=True).order_by("-created_at")[:30]
            print(f"Admin notifications count: {notifications.count()}")
        else:
            # Members get only their own notifications
            notifications = Notification.objects.filter(
                user=request.user
            ).order_by("-created_at")[:20]
            print(f"Member notifications count for {request.user}: {notifications.count()}")
        
        from apps.Community.views import get_notification_link
        data = [
            {
                "id": n.id,
                "message": n.message,
                "created_at": n.created_at.isoformat(),
                "is_read": n.is_read,
                "link": get_notification_link(n.message)
            }
            for n in notifications
        ]
        return Response({"results": data})
    
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def admin_notifications(self, request):
        if not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=403)
        
        notifications = Notification.objects.filter(user__isnull=True).order_by("-created_at")[:30]
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

    @action(detail=False, methods=["delete"], permission_classes=[IsAuthenticated])
    def delete_all(self, request):
        if request.user.is_staff:
            # Admin: Delete only admin notifications (user=NULL)
            deleted_count = Notification.objects.filter(user__isnull=True).delete()[0]
            return Response({"detail": f"Admin notifications deleted successfully. ({deleted_count} deleted)"}, status=status.HTTP_204_NO_CONTENT)
        else:
            # Member: Delete only their own notifications
            deleted_count = Notification.objects.filter(user=request.user).delete()[0]
            return Response({"detail": f"Your notifications deleted successfully. ({deleted_count} deleted)"}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_all_read(self, request):
        if request.user.is_staff:
            # Admin marks only admin notifications as read
            Notification.objects.filter(is_read=False, user__isnull=True).update(is_read=True)
        else:
            # Members mark only their own notifications as read
            Notification.objects.filter(
                is_read=False,
                user=request.user
            ).update(is_read=True)
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
            
            # Update user's email notification preference
            request.user.email_notifications = email_enabled
            request.user.save()
            
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
        """Update admin WhatsApp notification preferences"""
        try:
            whatsapp_enabled = request.data.get('whatsapp_enabled', False)
            
            # Update user's WhatsApp notification preference
            request.user.whatsapp_notifications = whatsapp_enabled
            request.user.save()
            
            return Response({
                'message': 'WhatsApp preferences updated successfully',
                'whatsapp_enabled': whatsapp_enabled
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"], permission_classes=[IsAdminUser])
    def get_preferences(self, request):
        """Get admin notification preferences"""
        try:
            return Response({
                'email_enabled': request.user.email_notifications,
                'whatsapp_enabled': request.user.whatsapp_notifications,
                'message': 'Preferences retrieved successfully'
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )



