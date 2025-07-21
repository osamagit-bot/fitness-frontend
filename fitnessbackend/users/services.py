# users/services.py - Service layer for notifications
from .models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Centralized notification service for custom notifications"""
    
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def create_notification(self, message, user_id=None):
        """Create a notification with optional WebSocket broadcast"""
        notification = Notification.objects.create(
            message=message,
            user_id=user_id
        )
        
        # Send real-time notification via WebSocket
        if self.channel_layer:
            self._send_websocket_notification(notification)
        
        logger.info(f"Custom notification created: {message}")
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
    
    # Custom notification methods (not covered by signals)
    def membership_renewed(self, member):
        """Send notification for membership renewal"""
        message = f"Membership renewed for: {member.first_name} {member.last_name}"
        return self.create_notification(message)
    
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

# Global notification service instance
notification_service = NotificationService()
