from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.Authentication'
 # Use the full path
    label = 'Authentication'  # Keep the label simple
