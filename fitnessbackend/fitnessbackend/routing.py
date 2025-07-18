from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from users import routing as users_routing
from users.middleware import TokenAuthMiddleware
from channels.security.websocket import AllowedHostsOriginValidator
import os

# Production-ready ASGI application with origin validation
if os.environ.get('DJANGO_ENVIRONMENT') == 'production':
    websocket_app = AllowedHostsOriginValidator(
        TokenAuthMiddleware(
            URLRouter(
                users_routing.websocket_urlpatterns
            )
        )
    )
else:
    # Development: Skip origin validation for ease of use
    websocket_app = TokenAuthMiddleware(
        URLRouter(
            users_routing.websocket_urlpatterns
        )
    )

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": websocket_app,
})
