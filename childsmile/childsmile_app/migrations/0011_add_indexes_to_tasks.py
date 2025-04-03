# filepath: c:\Dev\FinalProjectOpenU\childsmile\childsmile_app\migrations\0011_add_indexes_to_tasks.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0010_support_multiple_roles_per_staff'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='tasks',
            index=models.Index(fields=['assigned_to_id'], name='idx_tasks_assigned_to_id'),
        ),
        migrations.AddIndex(
            model_name='tasks',
            index=models.Index(fields=['updated_at'], name='idx_tasks_updated_at'),
        ),
    ]