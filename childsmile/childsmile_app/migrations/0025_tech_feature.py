from django.db import migrations, models


def add_initial_family_data_permissions(apps, schema_editor):
    Role = apps.get_model("childsmile_app", "Role")
    Permissions = apps.get_model("childsmile_app", "Permissions")

    all_roles = [
        "Technical Coordinator",
        "System Administrator",
        "Tutor",
        "General Volunteer",
        "Tutors Coordinator",
        "Volunteer Coordinator",
        "Families Coordinator",
        "Matures Coordinator",
        "Healthy Kids Coordinator",
    ]

    create_update_roles = [
        "Technical Coordinator",
        "System Administrator",
        "Tutor",
        "General Volunteer",
        "Tutors Coordinator",
        "Volunteer Coordinator",
        "Families Coordinator",
    ]

    delete_roles = [
        "Technical Coordinator",
        "System Administrator",
        "Families Coordinator",
    ]

    # All roles get view
    for role_name in all_roles:
        role = Role.objects.filter(role_name=role_name).first()
        if role:
            Permissions.objects.get_or_create(
                role=role, resource="initial_family_data", action="view"
            )

    # Only some get create/update
    for role_name in create_update_roles:
        role = Role.objects.filter(role_name=role_name).first()
        if role:
            Permissions.objects.get_or_create(
                role=role, resource="initial_family_data", action="create"
            )
            Permissions.objects.get_or_create(
                role=role, resource="initial_family_data", action="update"
            )

    # Only some get delete
    for role_name in delete_roles:
        role = Role.objects.filter(role_name=role_name).first()
        if role:
            Permissions.objects.get_or_create(
                role=role, resource="initial_family_data", action="delete"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0024_add_child_name_gv_feedbacks"),
    ]

    operations = [
        migrations.CreateModel(
            name="InitialFamilyData",
            fields=[
                (
                    "initial_family_data_id",
                    models.AutoField(primary_key=True, auto_created=True),
                ),
                (
                    "names",
                    models.CharField(max_length=500, null=False, blank=False),
                ),
                (
                    "phones",
                    models.CharField(max_length=500, null=False, blank=False),
                ),
                (
                    "other_information",
                    models.TextField(max_length=500, null=True, blank=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("family_added", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "initial_family_data",
            },
        ),
        # add fields to Tasks model
        migrations.AddField(
            model_name="tasks",
            name="initial_family_data_id_fk",
            field=models.ForeignKey(
                to="childsmile_app.initialfamilydata",
                on_delete=models.SET_NULL,
                null=True,
                blank=True,
                db_column="initial_family_data_id_fk",
            ),
        ),
        migrations.AddField(
            model_name="tasks",
            name="names",
            field=models.CharField(max_length=500, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="tasks",
            name="phones",
            field=models.CharField(max_length=500, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="tasks",
            name="other_information",
            field=models.TextField(max_length=500, null=True, blank=True),
        ),
        migrations.AddIndex(
            model_name="tasks",
            index=models.Index(
                fields=["initial_family_data_id_fk"],
                name="idx_tasks_init_family_data_fk",
            ),
        ),
        # add field to feedbacks model
        migrations.AddField(
            model_name="feedback",
            name="names",
            field=models.CharField(max_length=500, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="feedback",
            name="phones",
            field=models.CharField(max_length=500, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="feedback",
            name="other_information",
            field=models.TextField(max_length=500, null=True, blank=True),
        ),
        # add permissions for initial_family_data
        migrations.RunPython(add_initial_family_data_permissions),
    ]
