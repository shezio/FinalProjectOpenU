# Generated migration for creating default admin user

from django.db import migrations


def create_default_admin(apps, schema_editor):
    """Create default admin user if it doesn't exist"""
    Staff = apps.get_model('childsmile_app', 'Staff')
    Role = apps.get_model('childsmile_app', 'Role')
    
    # Only create if doesn't exist
    if not Staff.objects.filter(email='shlezi0@gmail.com').exists():
        staff_user = Staff.objects.create(
            email='shlezi0@gmail.com',
            username='שלמה_בונצל',
            first_name='שלמה',
            last_name='בונצל',
            registration_approved=True,
        )
        
        # Assign System Administrator role
        try:
            admin_role = Role.objects.get(role_name='System Administrator')
            staff_user.roles.add(admin_role)
        except Role.DoesNotExist:
            pass
    else:
        print("Default admin user already exists, skipping creation.")      

def reverse_default_admin(apps, schema_editor):
    """Reverse operation - delete the default admin user if it was created by this migration"""
    print("Reversing migration - keeping the default admin user intact.")


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0041_add_rejection_reason_to_tasks'),
    ]

    operations = [
        migrations.RunPython(create_default_admin, reverse_default_admin),
    ]