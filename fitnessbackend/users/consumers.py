import json
from channels.generic.websocket import AsyncWebsocketConsumer
import logging
from django.core.exceptions import ValidationError

logger = logging.getLogger("django.channels")

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.user = self.scope.get("user")
            if self.user is None or self.user.is_anonymous:
                logger.warning("WebSocket connection rejected: unauthenticated user")
                await self.close(code=4001)  # Custom close code for authentication failure
                return
            
            self.group_name = f"user_{self.user.id}_notifications"
            logger.info(f"WebSocket connection accepted for user_id: {self.user.id}")
            
            # Join user-specific notification group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()
            
            # Send connection success message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'WebSocket connection established successfully'
            }))
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {str(e)}")
            await self.close(code=4000)  # Custom close code for server error

    async def disconnect(self, close_code):
        try:
            if hasattr(self, "group_name"):
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
                logger.info(f"WebSocket disconnected for user_id: {getattr(self.user, 'id', 'unknown')}, close_code: {close_code}")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {str(e)}")

    async def receive(self, text_data):
        try:
            # Parse incoming message
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Respond to ping with pong for connection health check
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }))
            else:
                logger.warning(f"Received unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.warning("Received invalid JSON data")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error in WebSocket receive: {str(e)}")

    async def send_notification(self, event):
        try:
            notification = event['notification']
            await self.send(text_data=json.dumps({
                'type': 'notification',
                'notification': notification
            }))
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")

class TestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info("TestConsumer: WebSocket connection accepted")
        await self.accept()

    async def disconnect(self, close_code):
        logger.info("TestConsumer: WebSocket disconnected")

    async def receive(self, text_data):
        logger.info(f"TestConsumer: Received message: {text_data}")
        await self.send(text_data=json.dumps({"message": "Echo: " + text_data}))
