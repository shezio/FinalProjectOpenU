from django.db import migrations

class Migration(migrations.Migration):

    def remove_permissions(apps, schema_editor):
        Role = apps.get_model("childsmile_app", "Role")
        Permissions = apps.get_model("childsmile_app", "Permissions")
        # Get the role IDs for the specified roles
        roles = Role.objects.filter(
            role_name__in=["Technical Coordinator", "Volunteer Coordinator", "Tutors Coordinator"]
        )
        # Delete permissions for those roles, action DELETE, resource childsmile_app_staff
        Permissions.objects.filter(
            role_id__in=roles.values_list('id', flat=True),
            action="DELETE",
            resource="childsmile_app_staff"
        ).delete()

    dependencies = [
        ("childsmile_app", "0022_add_more_volunteers"),
    ]

    operations = [
        migrations.RunPython(remove_permissions)
    ]