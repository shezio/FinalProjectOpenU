from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0039_registration_approval_system'),
    ]

    operations = [
        migrations.AddField(
            model_name='tasks',
            name='user_info',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
