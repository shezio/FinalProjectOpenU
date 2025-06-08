from django.db import migrations, models


class Migration(migrations.Migration):

    def remove_unwanted_permissions(apps, schema_editor):
        Role = apps.get_model("childsmile_app", "Role")
        Permissions = apps.get_model("childsmile_app", "Permissions")
        # Get the role IDs for roles that are NOT the specified ones
        excluded_roles = [
            "Tutors Coordinator",
            "Families Coordinator",
            "System Administrator",
        ]
        roles = Role.objects.exclude(role_name__in=excluded_roles)
        # Remove all permissions for those roles except VIEW
        Permissions.objects.filter(
            role_id__in=roles.values_list("id", flat=True),
            resource="childsmile_app_tutorships",
        ).exclude(action="VIEW").delete()

    dependencies = [
        ("childsmile_app", "0026_task_del_cascade"),
    ]

    # need to remove all permissions other than VIEW for roles that are not  'Tutors Coordinator' or 'Families Coordinator' or 'System Administrator'
    operations = [
        migrations.RunPython(remove_unwanted_permissions),
    ]
