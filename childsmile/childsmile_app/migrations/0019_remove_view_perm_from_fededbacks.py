from django.db import migrations

def remove_wrong_feedback_permissions(apps, schema_editor):
    Permissions = apps.get_model("childsmile_app", "Permissions")
    Role = apps.get_model("childsmile_app", "Role")

    # Remove VIEW permission for 'childsmile_app_general_v_feedback' from roles named 'Tutor'
    tutor_roles = Role.objects.filter(role_name="Tutor")
    Permissions.objects.filter(
        role__in=tutor_roles,
        resource="childsmile_app_general_v_feedback",
        action="VIEW"
    ).delete()

    # Remove VIEW permission for 'childsmile_app_tutor_feedback' from roles named 'General Volunteer'
    volunteer_roles = Role.objects.filter(role_name="General Volunteer")
    Permissions.objects.filter(
        role__in=volunteer_roles,
        resource="childsmile_app_tutor_feedback",
        action="VIEW"
    ).delete()

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0018_add_res_act_to_task_types"),
    ]

    operations = [
        migrations.RunPython(remove_wrong_feedback_permissions),
    ]