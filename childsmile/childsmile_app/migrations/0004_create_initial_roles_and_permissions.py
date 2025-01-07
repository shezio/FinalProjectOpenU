# 0004_create_initial_roles_and_permissions.py
from django.db import migrations

def create_initial_roles_and_permissions(apps, schema_editor):
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')

    roles = [
        'Technical Coordinator',
        'Volunteer Coordinator',
        'Families Coordinator',
        'Tutors Coordinator',
        'Matures Coordinator',
        'Superuser',
        'System Administrator'
    ]

    for role_name in roles:
        Role.objects.create(role_name=role_name)

    permissions = [
        # Technical Coordinator
        ('Technical Coordinator', 'Family', 'CREATE'),
        ('Technical Coordinator', 'Family', 'UPDATE'),
        ('Technical Coordinator', 'Family', 'DELETE'),
        ('Technical Coordinator', 'Volunteer', 'VIEW'),
        ('Technical Coordinator', 'Family', 'VIEW'),

        # Volunteer Coordinator
        ('Volunteer Coordinator', 'Volunteer', 'CREATE'),
        ('Volunteer Coordinator', 'Volunteer', 'UPDATE'),
        ('Volunteer Coordinator', 'Family', 'UPDATE'),
        ('Volunteer Coordinator', 'Family', 'DELETE'),
        ('Volunteer Coordinator', 'Volunteer', 'VIEW'),
        ('Volunteer Coordinator', 'Family', 'VIEW'),

        # Families Coordinator
        ('Families Coordinator', 'Family', 'UPDATE'),
        ('Families Coordinator', 'Family', 'DELETE'),
        ('Families Coordinator', 'Family', 'VIEW'),

        # Tutors Coordinator
        ('Tutors Coordinator', 'Tutor', 'CREATE'),
        ('Tutors Coordinator', 'Tutor', 'UPDATE'),
        ('Tutors Coordinator', 'Family', 'UPDATE'),
        ('Tutors Coordinator', 'Family', 'DELETE'),
        ('Tutors Coordinator', 'Tutor', 'VIEW'),
        ('Tutors Coordinator', 'Family', 'VIEW'),

        # Matures Coordinator
        ('Matures Coordinator', 'Mature', 'CREATE'),
        ('Matures Coordinator', 'Mature', 'UPDATE'),
        ('Matures Coordinator', 'Family', 'UPDATE'),
        ('Matures Coordinator', 'Family', 'DELETE'),
        ('Matures Coordinator', 'Mature', 'VIEW'),
        ('Matures Coordinator', 'Family', 'VIEW'),

        # Superuser
        ('Superuser', 'All', 'ALL'),

        # System Administrator
        ('System Administrator', 'User', 'CREATE'),
        ('System Administrator', 'User', 'UPDATE'),
        ('System Administrator', 'User', 'DELETE'),
        ('System Administrator', 'Role', 'MANAGE'),
        ('System Administrator', 'Permission', 'MANAGE'),
        ('System Administrator', 'Family', 'CREATE'),
        ('System Administrator', 'Family', 'UPDATE'),
        ('System Administrator', 'Family', 'DELETE'),
        ('System Administrator', 'Volunteer', 'CREATE'),
        ('System Administrator', 'Volunteer', 'UPDATE'),
        ('System Administrator', 'Volunteer', 'DELETE'),
        ('System Administrator', 'Tutor', 'CREATE'),
        ('System Administrator', 'Tutor', 'UPDATE'),
        ('System Administrator', 'Tutor', 'DELETE'),
        ('System Administrator', 'Mature', 'CREATE'),
        ('System Administrator', 'Mature', 'UPDATE'),
        ('System Administrator', 'Mature', 'DELETE'),
    ]

    for role_name, resource, action in permissions:
        role = Role.objects.get(role_name=role_name)
        Permissions.objects.create(role=role, resource=resource, action=action)

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0003_role_alter_permissions_role_alter_staff_role'),
    ]

    operations = [
        migrations.RunPython(create_initial_roles_and_permissions),
    ]