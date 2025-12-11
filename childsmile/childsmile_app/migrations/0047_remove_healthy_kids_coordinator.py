# 0047_remove_healthy_kids_coordinator.py
from django.db import migrations


def remove_healthy_kids_coordinator(apps, schema_editor):
    """
    Remove 'Healthy Kids Coordinator' role from all users and delete the role.
    This ensures data integrity by removing the role before deleting it.
    """
    Role = apps.get_model('childsmile_app', 'Role')
    Staff = apps.get_model('childsmile_app', 'Staff')
    
    try:
        # Get the role to be removed
        healthy_coordinator_role = Role.objects.get(role_name='Healthy Kids Coordinator')
        
        # Remove this role from all staff members who have it
        staff_with_role = Staff.objects.filter(roles=healthy_coordinator_role)
        for staff in staff_with_role:
            staff.roles.remove(healthy_coordinator_role)
        
        # Delete all permissions associated with this role
        # (cascade will handle this automatically, but being explicit is safer)
        healthy_coordinator_role.permissions_set.all().delete()
        
        # Delete the role itself
        healthy_coordinator_role.delete()
        
    except Role.DoesNotExist:
        # Role doesn't exist, nothing to do
        pass


def reverse_remove_healthy_kids_coordinator(apps, schema_editor):
    """
    Reverse operation: Recreate the role and its permissions.
    Note: This will not restore which staff members had the role,
    as that information is lost during the forward migration.
    """
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')
    
    # Only recreate if it doesn't exist
    if not Role.objects.filter(role_name='Healthy Kids Coordinator').exists():
        healthy_coordinator_role = Role.objects.create(role_name='Healthy Kids Coordinator')
        
        # Recreate permissions for Healthy Kids Coordinator
        permissions_data = [
            ('Healthy Kids Coordinator', 'childsmile_app_tutors', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_children', 'CREATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_children', 'UPDATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_children', 'DELETE'),
            ('Healthy Kids Coordinator', 'childsmile_app_children', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_tutorships', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'CREATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'UPDATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'DELETE'),
            ('Healthy Kids Coordinator', 'childsmile_app_healthy', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'CREATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'UPDATE'),
            ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'DELETE'),
            ('Healthy Kids Coordinator', 'childsmile_app_tasks', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_task_types', 'VIEW'),
            ('Healthy Kids Coordinator', 'childsmile_app_possible_matches', 'VIEW'),
        ]
        
        for role_name, resource, action in permissions_data:
            Permissions.objects.create(
                role=healthy_coordinator_role,
                resource=resource,
                action=action
            )


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0046_add_prev_task_statuses'),
    ]

    operations = [
        migrations.RunPython(
            remove_healthy_kids_coordinator,
            reverse_remove_healthy_kids_coordinator
        ),
    ]
