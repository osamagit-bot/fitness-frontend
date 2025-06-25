from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Command(BaseCommand):
    help = 'Send a test notification to a user via WebSocket'

    def add_arguments(self, parser):
        parser.add_argument('user_id', type=int, help='User ID to send notification to')
        parser.add_argument('message', type=str, help='Notification message')

    def handle(self, *args, **options):
        user_id = options['user_id']
        message = options['message']

        channel_layer = get_channel_layer()
        group_name = f"user_{user_id}_notifications"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "send_notification",
                "notification": {
                    "id": 1,
                    "message": message,
                    "created_at": "2025-06-15T12:00:00Z",
                    "is_read": False,
                },
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Sent test notification to user {user_id}"))
