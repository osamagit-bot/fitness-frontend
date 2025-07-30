from django.apps import AppConfig


class MemberConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.Member'
    label = 'Member'
    
    def ready(self):
        import apps.Member.signals
