from django.db import models

class SiteSettings(models.Model):
    email_notifications_enabled = models.BooleanField(default=True)
    whatsapp_notifications_enabled = models.BooleanField(default=False)
    # Add other global settings as needed

    def __str__(self):
        return f"SiteSettings (Email: {self.email_notifications_enabled}, WhatsApp: {self.whatsapp_notifications_enabled})"

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
