# Generated manually for soft delete functionality

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Stock', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='stockout',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='stockout',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]