# Generated migration for adding last_review_talk_conducted field to Children model
# and creating the MONTHLY_FAMILY_REVIEW_TALK task type

from django.db import migrations, models


def add_monthly_review_task_type(apps, schema_editor):
    """Add the monthly family review task type to the database."""
    Task_Types = apps.get_model("childsmile_app", "Task_Types")
    
    # Create the task type if it doesn't exist
    Task_Types.objects.get_or_create(
        task_type='שיחת ביקורת',
        defaults={
            'resource': 'childsmile_app_children',
            'action': 'CREATE'
        }
    )


def remove_monthly_review_task_type(apps, schema_editor):
    """Reverse: Remove the monthly family review task type."""
    Task_Types = apps.get_model("childsmile_app", "Task_Types")
    Task_Types.objects.filter(task_type='שיחת ביקורת').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0048_inactive_staff_feature'),
    ]

    operations = [
        migrations.AddField(
            model_name='children',
            name='last_review_talk_conducted',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.RunPython(add_monthly_review_task_type, remove_monthly_review_task_type),
    ]
