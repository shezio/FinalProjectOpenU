from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0045_add_registration_permission_to_admin'),
    ]

    operations = [
        migrations.CreateModel(
            name='PrevTaskStatuses',
            fields=[
                ('prev_task_id', models.AutoField(primary_key=True, serialize=False)),
                ('task_id', models.BigIntegerField()),  # FK to Tasks.task_id (not a direct FK to allow soft deletes)
                ('previous_status', models.CharField(max_length=255)),
                ('new_status', models.CharField(max_length=255)),
                # Full task snapshot for reverting
                ('task_snapshot', models.JSONField()),  # Stores entire task details before status change
                ('changed_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.staff')),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'childsmile_app_prevtaskstatuses',
            },
        ),
    ]
