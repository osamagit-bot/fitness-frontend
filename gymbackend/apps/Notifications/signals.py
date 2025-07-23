# users/signals.py - Centralized notification system
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Notification
from apps.Member.models import Member,Trainer
from apps.Community.models import Post,Announcement,Challenge,SupportTicket
from apps.Attendance.models import Attendance
from django.utils import timezone
import pytz
        
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
        print(f"🔔 SIGNAL TRIGGERED: New member created - {instance.first_name} {instance.last_name}")
        
        message = f"New member registered: {instance.first_name} {instance.last_name}"
        
        # Create in-app notification
        notification = Notification.objects.create(message=message)
        
        # Send email notification
        from .email_service import EmailNotificationService
        email_service = EmailNotificationService()
        
        email_success = email_service.send_admin_notification_email(
            subject="New Member Registration",
            message=f"A new member has been registered:\n\n"
                   f"Name: {instance.first_name} {instance.last_name}\n"
                   f"Athlete ID: {instance.athlete_id}\n"
                   f"Email: {instance.user.email if instance.user else 'N/A'}\n"
                   f"Membership Type: {instance.get_membership_type_display()}\n"
                   f"Monthly Fee: ${instance.monthly_fee}\n"
                   f"Start Date: {instance.start_date}\n"
                   f"Expiry Date: {instance.expiry_date}"
        )
        
        print(f"📧 Email notification sent: {email_success}")
        
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

@receiver(post_delete, sender=Member)
def member_deleted_notification(sender, instance, **kwargs):
    """Send notification when a member is deleted"""
    message = f"Member deleted: {instance.first_name} {instance.last_name}"
    
    # Create in-app notification
    notification = Notification.objects.create(message=message)
    
    # Send email notification
    from .email_service import EmailNotificationService
    email_service = EmailNotificationService()
    
    email_success = email_service.send_admin_notification_email(
        subject="Member Deleted",
        message=f"A member has been deleted from the system:\n\n"
               f"Name: {instance.first_name} {instance.last_name}\n"
               f"Athlete ID: {instance.athlete_id}\n"
               f"Email: {instance.user.email if instance.user else 'N/A'}\n"
               f"Membership Type: {instance.get_membership_type_display()}\n"
               f"Monthly Fee: ${instance.monthly_fee}\n"
               f"Original Start Date: {instance.start_date}\n"
               f"Expiry Date: {instance.expiry_date}"
    )
    
    print(f"📧 Member deletion email notification sent: {email_success}")
    
    # Send real-time WebSocket notification
    send_realtime_notification(message, notification.id)
    logger.info(f"Member deletion notification sent: {message}")

@receiver(post_save, sender=Attendance)
def member_checkin_notification(sender, instance, created, **kwargs):
    """Send notification when a member checks in"""
    if created:  # Only for new check-ins
        member = instance.member
        message = f"Member checked in: {member.first_name} {member.last_name}"
        
        # Create in-app notification
        notification = Notification.objects.create(message=message)
        
        # Convert to Afghanistan timezone for email
        kabul_tz = pytz.timezone('Asia/Kabul')
        local_time = instance.check_in_time.astimezone(kabul_tz)
        
        # Send email notification
        from .email_service import EmailNotificationService
        email_service = EmailNotificationService()
        
        email_success = email_service.send_admin_notification_email(
            subject="Member Check-in Notification",
            message=f"A member has checked in today:\n\n"
                   f"Name: {member.first_name} {member.last_name}\n"
                   f"Athlete ID: {member.athlete_id}\n"
                   f"Email: {member.user.email if member.user else 'N/A'}\n"
                   f"Membership Type: {member.get_membership_type_display()}\n"
                   f"Check-in Time: {local_time.strftime('%Y-%m-%d %I:%M:%S %p')} (Afghanistan Time)\n"
                   f"Time Slot: {member.get_time_slot_display()}\n"
                   f"Verification Method: {getattr(instance, 'verification_method', 'Biometric')}"
        )
        
        print(f"📧 Email sent: {email_success}")
        print(f"🕐 UTC: {instance.check_in_time}")
        print(f"🕐 Afghanistan: {local_time.strftime('%I:%M:%S %p')}")
        
        # Send real-time WebSocket notification
        send_realtime_notification(message, notification.id)
        logger.info(f"Member check-in notification sent: {message}")







