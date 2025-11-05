# Generated migration for adding rejection_reason field to Tasks model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0040_add_user_info_to_tasks'),
    ]

    operations = [
        migrations.AddField(
            model_name='tasks',
            name='rejection_reason',
            field=models.TextField(blank=True, max_length=200, null=True),
        ),
    ]
