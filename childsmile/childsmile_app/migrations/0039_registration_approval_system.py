from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0038_audit_actions_translate'),
    ]

    operations = [
        # Add registration_approved field to Staff model
        migrations.AddField(
            model_name='staff',
            name='registration_approved',
            field=models.BooleanField(default=False),
        ),
        # Create the new task type for registration approval
        migrations.RunSQL(
            sql="""
            INSERT INTO childsmile_app_task_types (task_type, resource, action) 
            VALUES ('אישור הרשמה', 'registration', 'APPROVE')
            ON CONFLICT (task_type) DO NOTHING;
            """,
            reverse_sql="DELETE FROM childsmile_app_task_types WHERE task_type = 'אישור הרשמה';",
        ),
        # Set registration_approved=True for all existing staff members
        migrations.RunSQL(
            sql="UPDATE childsmile_app_staff SET registration_approved = TRUE;",
            reverse_sql="UPDATE childsmile_app_staff SET registration_approved = FALSE;",
        ),
    ]
