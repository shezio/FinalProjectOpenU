from django.db import migrations


def add_registration_permission_to_admin(apps, schema_editor):
    """
    Add registration approval permission to System Administrator role
    """
    Permission = apps.get_model("childsmile_app", "Permissions")
    Role = apps.get_model("childsmile_app", "Role")
    
    try:
        # Get the System Administrator role
        admin_role = Role.objects.get(role_name="System Administrator")
        
        # Create the permission if it doesn't exist
        permission, created = Permission.objects.get_or_create(
            role=admin_role,
            resource="registration",
            action="APPROVE",
        )
        
        if created:
            print(f"Created registration approval permission for System Administrator")
        else:
            print(f"Registration approval permission already exists for System Administrator")
    except Role.DoesNotExist:
        print("System Administrator role not found")
    except Exception as e:
        print(f"Error adding registration permission: {str(e)}")


def remove_registration_permission_from_admin(apps, schema_editor):
    """
    Reverse: Remove registration approval permission from System Administrator role
    """
    Permission = apps.get_model("childsmile_app", "Permissions")
    Role = apps.get_model("childsmile_app", "Role")
    
    try:
        admin_role = Role.objects.get(role_name="System Administrator")
        Permission.objects.filter(
            role=admin_role,
            resource="registration",
            action="APPROVE"
        ).delete()
        print(f"Removed registration approval permission from System Administrator")
    except Role.DoesNotExist:
        print("System Administrator role not found")
    except Exception as e:
        print(f"Error removing registration permission: {str(e)}")


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0044_update_status_choice'),
    ]

    operations = [
        migrations.RunPython(
            add_registration_permission_to_admin,
            remove_registration_permission_from_admin,
        ),
    ]
