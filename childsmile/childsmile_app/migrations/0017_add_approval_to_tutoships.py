from django.db import migrations, models
from django.utils.timezone import now

def populate_approval_fields(apps, schema_editor):
    # Get the models dynamically
    Role = apps.get_model('childsmile_app', 'Role')
    Tutorship = apps.get_model('childsmile_app', 'Tutorships')

    # Dynamically fetch role IDs for Tutors Coordinator and Families Coordinator
    tutors_coordinator_role = Role.objects.filter(role_name='Tutors Coordinator').first()
    families_coordinator_role = Role.objects.filter(role_name='Families Coordinator').first()

    # Ensure the roles exist
    if not tutors_coordinator_role or not families_coordinator_role:
        raise ValueError("Required roles (Tutors Coordinator, Families Coordinator) are missing in the database.")

    tutors_coordinator_id = tutors_coordinator_role.id
    families_coordinator_id = families_coordinator_role.id

    # Populate the fields for existing rows
    for tutorship in Tutorship.objects.all():
        tutorship.updated_at = now()
        tutorship.approval_counter = 2
        tutorship.last_approver = [tutors_coordinator_id, families_coordinator_id]
        tutorship.save()

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0016_grant_matches_permissions"),  # Update this to the last migration in your project
    ]

    operations = [
        migrations.AddField(
            model_name='tutorships',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='tutorships',
            name='approval_counter',
            field=models.SmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='tutorships',
            name='last_approver',
            field=models.JSONField(default=list),  # Store role IDs as a list
        ),
        migrations.RunPython(populate_approval_fields),
    ]