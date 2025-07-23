from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.Notifications'
    
    def ready(self):
        import apps.Notifications.signals
