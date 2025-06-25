from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from users import routing as users_routing
from users.middleware import TokenAuthMiddleware

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddleware(
        URLRouter(
            users_routing.websocket_urlpatterns
        )
    ),
})
