from django.db import migrations

def add_permissions(apps, schema_editor):
    Role = apps.get_model("childsmile_app", "Role")  # Role model
    Permission = apps.get_model("childsmile_app", "Permissions")  # Permissions model

    # Define the roles and permissions
    roles_to_update = ["System Administrator", "Tutors Coordinator", "Families Coordinator"]
    permissions_to_add = ["CREATE", "UPDATE", "DELETE"]
    resource_name = "childsmile_app_possiblematches"  # Resource name

    # Fetch the roles
    roles = Role.objects.filter(role_name__in=roles_to_update)

    # Add permissions for each role
    for role in roles:
        for action in permissions_to_add:
            Permission.objects.create(
                role_id=role.id,  # Use the role's ID
                resource=resource_name,  # Resource name
                action=action  # Action (CREATE, UPDATE, DELETE)
            )
            print(f"DEBUG: Added permission '{action}' for role '{role.role_name}' on resource '{resource_name}'")

    print("DEBUG: All permissions added successfully.")

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0015_add_gender_to_matches"),
    ]

    operations = [
        migrations.RunPython(add_permissions),
    ]