# users/signals.py - Centralized notification system
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Member, Trainer, Notification, Challenge, Announcement, SupportTicket, Post
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

# Get channel layer for WebSocket notifications
channel_layer = get_channel_layer()

@receiver(post_save, sender=Member)
def member_created_notification(sender, instance, created, **kwargs):
    """Send notification when a new member is registered"""
    if created:
        message = f"New member registered: {instance.first_name} {instance.last_name}"
        notification = Notification.objects.create(message=message)
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Member registration notification sent: {message}")

@receiver(post_save, sender=Member)
def member_updated_notification(sender, instance, created, **kwargs):
    """Send notification when a member profile is updated"""
    if not created:  # Only for updates, not creation
        message = f"Member profile updated: {instance.first_name} {instance.last_name}"
        notification = Notification.objects.create(message=message)
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Member update notification sent: {message}")

@receiver(post_save, sender=Trainer)
def trainer_created_notification(sender, instance, created, **kwargs):
    """Send notification when a new trainer is registered"""
    if created:
        message = f"New trainer registered: {instance.first_name} {instance.last_name}"
        notification = Notification.objects.create(message=message)
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Trainer registration notification sent: {message}")

@receiver(post_save, sender=Challenge)
def challenge_created_notification(sender, instance, created, **kwargs):
    """Send notification when a new challenge is created"""
    if created:
        message = f"New admin challenge created: {instance.title}"
        notification = Notification.objects.create(message=message)
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Challenge creation notification sent: {message}")

@receiver(post_save, sender=Announcement)
def announcement_created_notification(sender, instance, created, **kwargs):
    """Send notification when a new announcement is created"""
    if created:
        message = f"New admin announcement created: {instance.title}"
        notification = Notification.objects.create(message=message)
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Announcement creation notification sent: {message}")

@receiver(post_delete, sender=Challenge)
def challenge_deleted_notification(sender, instance, **kwargs):
    """Send notification when a challenge is deleted"""
    message = f"Admin deleted challenge: {instance.title}"
    notification = Notification.objects.create(message=message)
    
    # Send real-time WebSocket notification
    send_realtime_notification(message, notification.id)
    logger.info(f"Challenge deletion notification sent: {message}")

@receiver(post_delete, sender=Announcement)
def announcement_deleted_notification(sender, instance, **kwargs):
    """Send notification when an announcement is deleted"""
    message = f"Admin deleted announcement: {instance.title}"
    notification = Notification.objects.create(message=message)
    
    # Send real-time WebSocket notification
    send_realtime_notification(message, notification.id)
    logger.info(f"Announcement deletion notification sent: {message}")

@receiver(post_save, sender=Post)
def post_created_notification(sender, instance, created, **kwargs):
    """Send notification when a new community post is created"""
    if created:
        # Get the member who created the post
        try:
            member = Member.objects.get(user=instance.created_by)
            username = member.first_name + " " + member.last_name
        except Member.DoesNotExist:
            username = instance.created_by.username
        
        # Create enhanced notification with post ID for clickable link
        message = f"{username} posted: \"{instance.title[:50]}{'...' if len(instance.title) > 50 else ''}\""
        
        # Create notification with post metadata (temporarily without new fields)
        notification = Notification.objects.create(
            message=message
        )
        
        # Send real-time WebSocket notification with post data
        send_realtime_notification_with_post(message, notification.id, instance.id, instance.title)
        logger.info(f"Community post notification sent: {message}")

def send_realtime_notification_with_post(message, notification_id, post_id, post_title):
    """Send real-time WebSocket notification with post data for clickable links"""
    if channel_layer:
        try:
            # Send to admin notification group with post data
            async_to_sync(channel_layer.group_send)(
                "admin_notifications",
                {
                    "type": "send_notification",
                    "notification": {
                        "id": notification_id,
                        "message": message,
                        "created_at": "now",
                        "is_read": False,
                        "notification_type": "community_post",
                        "post_id": post_id,
                        "post_title": post_title
                    }
                }
            )
            logger.info(f"Real-time post notification sent: {message}")
        except Exception as e:
            logger.error(f"Failed to send real-time post notification: {str(e)}")
    else:
        logger.warning("Channel layer not available for real-time post notifications")

def send_realtime_notification(message, notification_id):
    """Send real-time WebSocket notification to all admin users"""
    if channel_layer:
        try:
            # Send to admin notification group
            async_to_sync(channel_layer.group_send)(
                "admin_notifications",
                {
                    "type": "send_notification",
                    "notification": {
                        "id": notification_id,
                        "message": message,
                        "created_at": "now",
                        "is_read": False
                    }
                }
            )
            logger.info(f"Real-time notification sent: {message}")
        except Exception as e:
            logger.error(f"Failed to send real-time notification: {str(e)}")
    else:
        logger.warning("Channel layer not available for real-time notifications")
