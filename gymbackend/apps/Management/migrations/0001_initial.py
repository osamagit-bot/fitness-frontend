# Generated by Django 5.1.1 on 2025-07-30 13:28

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='SiteSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_notifications_enabled', models.BooleanField(default=True)),
                ('whatsapp_notifications_enabled', models.BooleanField(default=False)),
                ('maintenance_mode_enabled', models.BooleanField(default=False)),
            ],
        ),
    ]
