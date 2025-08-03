from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.Member.models import Member
from apps.Notifications.models import Notification
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Command(BaseCommand):
    help = 'Check for expiring memberships and send notifications'

    def handle(self, *args, **options):
        today = date.today()
        
        # Check for memberships expiring in 3 days
        warning_date = today + timedelta(days=3)
        expiring_members = Member.objects.filter(
            expiry_date=warning_date,
            is_active=True
        )
        
        # Check for expired memberships (today)
        expired_members = Member.objects.filter(
            expiry_date=today,
            is_active=True
        )
        
        # Send expiry warnings
        for member in expiring_members:
            self.send_expiry_warning(member)
            
        # Send expired notifications
        for member in expired_members:
            self.send_expired_notification(member)
            
        self.stdout.write(
            self.style.SUCCESS(
                f'Processed {expiring_members.count()} expiring and {expired_members.count()} expired memberships'
            )
        )
    
    def send_expiry_warning(self, member):
        """Send 3-day expiry warning"""
        try:
            # Check if warning already sent
            existing = Notification.objects.filter(
                user=member.user,
                message__contains=f"Your membership expires in 3 days on {member.expiry_date.strftime('%B %d, %Y')}"
            ).exists()
            
            if existing:
                return
                
            notification = Notification.objects.create(
                user=member.user,
                message=f"Your membership expires in 3 days on {member.expiry_date.strftime('%B %d, %Y')}. Please renew to continue your fitness journey!"
            )
            
            # Send real-time notification
            channel_layer = get_channel_layer()
            notification_data = {
                "id": notification.id,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "is_read": notification.is_read,
                "link": "/member-dashboard"
            }
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user.id}_notifications",
                {
                    "type": "send_notification",
                    "notification": notification_data
                }
            )
            
            self.stdout.write(f"Sent expiry warning to {member.first_name} {member.last_name}")
            
        except Exception as e:
            self.stdout.write(f"Failed to send warning to {member.first_name}: {e}")
    
    def send_expired_notification(self, member):
        """Send expired membership notification"""
        try:
            # Check if expired notification already sent
            existing = Notification.objects.filter(
                user=member.user,
                message__contains=f"Your membership expired on {member.expiry_date.strftime('%B %d, %Y')}"
            ).exists()
            
            if existing:
                return
                
            notification = Notification.objects.create(
                user=member.user,
                message=f"Your membership expired on {member.expiry_date.strftime('%B %d, %Y')}. Please renew to continue accessing the gym."
            )
            
            # Send real-time notification
            channel_layer = get_channel_layer()
            notification_data = {
                "id": notification.id,
                "message": notification.message,
                "created_at": notification.created_at.isoformat(),
                "is_read": notification.is_read,
                "link": "/member-dashboard"
            }
            async_to_sync(channel_layer.group_send)(
                f"user_{member.user.id}_notifications",
                {
                    "type": "send_notification",
                    "notification": notification_data
                }
            )
            
            self.stdout.write(f"Sent expired notification to {member.first_name} {member.last_name}")
            
        except Exception as e:
            self.stdout.write(f"Failed to send expired notification to {member.first_name}: {e}")