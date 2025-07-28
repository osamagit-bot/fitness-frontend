# users/services.py - Service layer for notifications
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from .email_service import EmailNotificationService
from .whatsapp_service import WhatsAppNotificationService
from django.utils import timezone

logger = logging.getLogger(__name__)

class NotificationService:
    """Centralized notification service for custom notifications"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
        self.email_service = EmailNotificationService()
        self.whatsapp_service = WhatsAppNotificationService()
    
    def create_notification(self, message, user_id=None, send_email=False, send_whatsapp=False):
        """Create a notification with optional WebSocket broadcast, email, and WhatsApp"""
        notification = Notification.objects.create(
            message=message,
            user_id=user_id
        )
        
        # Send real-time notification via WebSocket
        if self.channel_layer:
            self._send_websocket_notification(notification)
        
        # Send email notification if enabled
        email_sent = False
        if send_email:
            email_sent = self._send_email_notification(message)
        
        # Send WhatsApp notification if enabled
        whatsapp_sent = False
        if send_whatsapp:
            whatsapp_sent = self._send_whatsapp_notification(message)
        
        logger.info(f"Custom notification created: {message} | Email: {email_sent} | WhatsApp: {whatsapp_sent}")
        return notification
    
    def _send_websocket_notification(self, notification):
        """Send notification via WebSocket to relevant users"""
        try:
            group_name = "admin_notifications" if not notification.user_id else f"user_{notification.user_id}_notifications"
            
            async_to_sync(self.channel_layer.group_send)(
                group_name,
                {
                    "type": "send_notification",
                    "notification": {
                        "id": notification.id,
                        "message": notification.message,
                        "created_at": notification.created_at.isoformat(),
                        "is_read": notification.is_read
                    }
                }
            )
            logger.info(f"WebSocket notification sent: {notification.message}")
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {str(e)}")
    
    def _send_email_notification(self, message):
        """Send email notification to admins if email notifications are enabled"""
        try:
            # Check if email notifications are enabled globally from database
            from apps.Management.models import SiteSettings
            site_settings = SiteSettings.get_settings()
            if not site_settings.email_notifications_enabled:
                return False
            
            # Send email with preference checking enabled
            subject = "System Notification"
            return self.email_service.send_admin_notification_email(
                subject, 
                message, 
                check_preferences=True  # Enable preference checking
            )
        except Exception as e:
            logger.error(f"Failed to send email notification: {str(e)}")
            return False
    
    def _send_whatsapp_notification(self, message):
        """Send WhatsApp notification to admins if WhatsApp notifications are enabled"""
        try:
            # Check if WhatsApp notifications are enabled globally from database
            from apps.Management.models import SiteSettings
            site_settings = SiteSettings.get_settings()
            if not site_settings.whatsapp_notifications_enabled:
                return False
            
            return self.whatsapp_service.send_admin_whatsapp_notification(message)
        except Exception as e:
            logger.error(f"Failed to send WhatsApp notification: {str(e)}")
            return False
    
    # Custom notification methods (not covered by signals)
    def membership_renewed(self, member):
        """Send notification for membership renewal"""
        message = f"Membership renewed for: {member.first_name} {member.last_name}"
        
        # Create in-app notification
        notification = self.create_notification(message)
        
        # Send email notification only to admins with email notifications enabled
        self.email_service.send_admin_notification_email(
            subject="Member Membership Renewed",
            message=f"A member has renewed their membership:\n\n"
                   f"Name: {member.first_name} {member.last_name}\n"
                   f"Athlete ID: {member.athlete_id}\n"
                   f"Email: {member.user.email if member.user else 'N/A'}\n"
                   f"Membership Type: {member.get_membership_type_display()}\n"
                   f"Monthly Fee: ${member.monthly_fee}\n"
                   f"New Start Date: {member.start_date}\n"
                   f"New Expiry Date: {member.expiry_date}\n"
                   f"Renewal Date: {timezone.now().date()}",
            check_preferences=True  # Enable preference checking
        )
        
        return notification
    
    def support_ticket_responded(self, ticket_id):
        """Send notification for support ticket response"""
        message = f"Admin responded to support ticket ID: {ticket_id}"
        return self.create_notification(message)
    
    def support_ticket_closed(self, ticket_id):
        """Send notification for closed support ticket"""
        message = f"Admin closed support ticket ID: {ticket_id}"
        return self.create_notification(message)
    
    def faq_deleted(self, faq_id):
        """Send notification for deleted FAQ"""
        message = f"Admin deleted FAQ ID: {faq_id}"
        return self.create_notification(message)
    
    def product_updated(self, product_name):
        """Send notification for product updates"""
        message = f"Product updated: {product_name}"
        return self.create_notification(message)
    
    def training_scheduled(self, member_name, trainer_name):
        """Send notification for training schedule"""
        message = f"Training scheduled for {member_name} with {trainer_name}"
        return self.create_notification(message)
    
    def payment_received(self, member_name, amount):
        """Send notification for payment received"""
        message = f"Payment received: {amount} AFN from {member_name}"
        return self.create_notification(message)
    
    def maintenance_mode(self, enabled=True):
        """Send notification for maintenance mode changes"""
        status = "enabled" if enabled else "disabled"
        message = f"Maintenance mode {status}"
        return self.create_notification(message)

    def member_checked_in(self, member, check_in_time=None):
        """Send notification for member check-in"""
        if not check_in_time:
            check_in_time = timezone.now()
        
        # Convert to Afghanistan timezone
        import pytz
        kabul_tz = pytz.timezone('Asia/Kabul')
        local_time = check_in_time.astimezone(kabul_tz)
        
        message = f"Member checked in: {member.first_name} {member.last_name}"
        
        # Create in-app notification
        notification = self.create_notification(message)
        
        # Send email notification only to admins with email notifications enabled
        self.email_service.send_admin_notification_email(
            subject="Member Check-in",
            message=f"A member has checked in today:\n\n"
                   f"Name: {member.first_name} {member.last_name}\n"
                   f"Athlete ID: {member.athlete_id}\n"
                   f"Email: {member.user.email if member.user else 'N/A'}\n"
                   f"Membership Type: {member.get_membership_type_display()}\n"
                   f"Check-in Time: {local_time.strftime('%Y-%m-%d %I:%M:%S %p')} (Afghanistan Time)\n"
                   f"Time Slot: {member.get_time_slot_display()}",
            check_preferences=True  # Enable preference checking
        )
        
        return notification

# Global notification service instance
notification_service = NotificationService()







