# 0010_support_multiple_roles_per_staff.py
from django.db import migrations, models


def migrate_existing_roles(apps, schema_editor):
    """
    Migrate existing roles from the Staff model to the new ManyToManyField.
    """
    Staff = apps.get_model("childsmile_app", "Staff")

    for staff in Staff.objects.all():
        if staff.role:  # Ensure the staff has a role
            staff.roles.add(staff.role)


class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0009_grant_view_permissions_to_all_users"),
    ]

    operations = [
        # Add the new ManyToManyField
        migrations.AddField(
            model_name="staff",
            name="roles",
            field=models.ManyToManyField(to="childsmile_app.Role", related_name="staff_members"),
        ),
        # Migrate existing data
        migrations.RunPython(migrate_existing_roles),
        # Remove the old ForeignKey field
        migrations.RemoveField(
            model_name="staff",
            name="role",
        ),
    ]