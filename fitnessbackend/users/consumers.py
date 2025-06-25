import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging

logger = logging.getLogger("django.channels")

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        if self.user is None or self.user.is_anonymous:
            logger.warning("WebSocket connection rejected: unauthenticated user")
            await self.close()
        else:
            self.group_name = f"user_{self.user.id}_notifications"
            logger.info(f"WebSocket connection accepted for user_id: {self.user.id}")
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def send_notification(self, event):
        notification = event['notification']
        await self.send(text_data=json.dumps({
            'notification': notification
        }))

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info("TestConsumer: WebSocket connection accepted")
        await self.accept()

    async def disconnect(self, close_code):
        logger.info("TestConsumer: WebSocket disconnected")

    async def receive(self, text_data):
        logger.info(f"TestConsumer: Received message: {text_data}")
        await self.send(text_data=json.dumps({"message": "Echo: " + text_data}))
