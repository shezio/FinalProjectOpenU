from django.db import migrations, models

def populate_task_type_resource_action(apps, schema_editor):
    TaskType = apps.get_model("childsmile_app", "Task_Types")
    task_type_data = [
        {"id": 1, "resource": "childsmile_app_tutorships", "action": "DELETE"},
        {"id": 2, "resource": "childsmile_app_tutors", "action": "DELETE"},
        {"id": 3, "resource": "childsmile_app_tutorships", "action": "DELETE"},
        {"id": 4, "resource": "childsmile_app_children", "action": "CREATE"},
        {"id": 5, "resource": "childsmile_app_children", "action": "UPDATE"},
        {"id": 6, "resource": "childsmile_app_children", "action": "UPDATE"},
        {"id": 7, "resource": "childsmile_app_children", "action": "DELETE"},
        {"id": 8, "resource": "childsmile_app_healthy", "action": "CREATE"},
        {"id": 9, "resource": "childsmile_app_matures", "action": "VIEW"},
        {"id": 10, "resource": "childsmile_app_tutorships", "action": "VIEW"},
        {"id": 11, "resource": "childsmile_app_tutor_feedback", "action": "CREATE"},
        {"id": 12, "resource": "childsmile_app_tutor_feedback", "action": "VIEW"},
        {"id": 13, "resource": "childsmile_app_general_v_feedback", "action": "CREATE"},
        {"id": 14, "resource": "childsmile_app_general_v_feedback", "action": "VIEW"},
        {"id": 15, "resource": "childsmile_app_staff", "action": "CREATE"},
    ]

    for data in task_type_data:
        TaskType.objects.filter(id=data["id"]).update(resource=data["resource"], action=data["action"])

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0017_add_approval_to_tutoships"),
    ]

    operations = [
        migrations.AddField(
            model_name="Task_Types",
            name="resource",
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="Task_Types",
            name="action",
            field=models.CharField(max_length=50, null=True),
        ),
        migrations.RunPython(populate_task_type_resource_action),
    ]