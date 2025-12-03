# Generated migration for adding Tutored Families Coordinator role

from django.db import migrations

def add_tutored_families_coordinator(apps, schema_editor):
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')

    # Delete Guest role and its permissions (if exists)
    guest_role = Role.objects.filter(role_name='Guest').first()
    if guest_role:
        Permissions.objects.filter(role=guest_role).delete()
        guest_role.delete()

    # Create 'Tutored Families Coordinator' role
    tutored_families_coordinator = Role.objects.create(role_name='Tutored Families Coordinator')

    # Get Families Coordinator to copy its permissions
    families_coordinator = Role.objects.get(role_name='Families Coordinator')
    families_permissions = Permissions.objects.filter(role=families_coordinator)

    # Copy all Families Coordinator permissions to Tutored Families Coordinator
    for perm in families_permissions:
        Permissions.objects.create(
            role=tutored_families_coordinator,
            resource=perm.resource,
            action=perm.action
        )


def reverse_tutored_families_coordinator(apps, schema_editor):
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')

    # Delete Tutored Families Coordinator and its permissions
    role = Role.objects.filter(role_name='Tutored Families Coordinator').first()
    if role:
        Permissions.objects.filter(role=role).delete()
        role.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0042_create_default_admin'),
    ]

    operations = [
        migrations.RunPython(add_tutored_families_coordinator, reverse_tutored_families_coordinator),
    ]