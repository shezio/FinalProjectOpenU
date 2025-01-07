import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0001_runSQLs'),
    ]

    operations = [
        migrations.CreateModel(
            name='Task_Types',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('task_type', models.CharField(max_length=255, unique=True, choices=[
                    ('Candidate Interview for Tutoring', 'Candidate Interview for Tutoring'),
                    ('Adding a Tutor', 'Adding a Tutor'),
                    ('Matching a Tutee', 'Matching a Tutee'),
                    ('Adding a Family', 'Adding a Family'),
                    ('Family Status Check', 'Family Status Check'),
                    ('Family Update', 'Family Update'),
                    ('Family Deletion', 'Family Deletion'),
                    ('Adding a Healthy Member', 'Adding a Healthy Member'),
                    ('Reviewing a Mature Individual', 'Reviewing a Mature Individual'),
                    ('Tutoring', 'Tutoring'),
                    ('Tutoring Feedback', 'Tutoring Feedback'),
                    ('Reviewing Tutor Feedback', 'Reviewing Tutor Feedback'),
                    ('General Volunteer Feedback', 'General Volunteer Feedback'),
                    ('Reviewing General Volunteer Feedback', 'Reviewing General Volunteer Feedback'),
                    ('Feedback Report Generation', 'Feedback Report Generation')
                ])),
            ],
        ),
        migrations.CreateModel(
            name='Tasks',
            fields=[
                ('task_id', models.AutoField(primary_key=True, serialize=False)),
                ('description', models.TextField()),
                ('due_date', models.DateField()),
                ('status', models.CharField(default='Pending', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tasks', to='childsmile_app.Staff')),
                ('related_child', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Children')),
                ('related_tutor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Tutors')),
                ('task_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Task_Types')),
            ],
        ),
    ]