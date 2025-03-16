# 0007_add_possible_matches_table.py
from django.db import migrations, models

def add_possible_matches_permissions(apps, schema_editor):
    Role = apps.get_model('childsmile_app', 'Role')
    Permissions = apps.get_model('childsmile_app', 'Permissions')

    roles = [
        'System Administrator',
        'Technical Coordinator',
        'Volunteer Coordinator',
        'Families Coordinator',
        'Tutors Coordinator',
        'Matures Coordinator',
        'Healthy Kids Coordinator',
        'General Volunteer',
        'Tutor'
    ]

    # Insert permissions from dev order.sql
    permissions = [
        # System Administrator
        ('System Administrator', 'childsmile_app_possible_matches', 'CREATE'),
        ('System Administrator', 'childsmile_app_possible_matches', 'UPDATE'),
        ('System Administrator', 'childsmile_app_possible_matches', 'DELETE'),
        ('System Administrator', 'childsmile_app_possible_matches', 'VIEW'),

        # Tutor
        ('Tutor', 'childsmile_app_possible_matches', 'CREATE'),
        ('Tutor', 'childsmile_app_possible_matches', 'UPDATE'),
        ('Tutor', 'childsmile_app_possible_matches', 'DELETE'),
        ('Tutor', 'childsmile_app_possible_matches', 'VIEW'),

        # Technical Coordinator
        ('Technical Coordinator', 'childsmile_app_possible_matches', 'VIEW'),

        # Families Coordinator
        ('Families Coordinator', 'childsmile_app_possible_matches', 'CREATE'),
        ('Families Coordinator', 'childsmile_app_possible_matches', 'UPDATE'),
        ('Families Coordinator', 'childsmile_app_possible_matches', 'DELETE'),
        ('Families Coordinator', 'childsmile_app_possible_matches', 'VIEW'),

        # Tutors Coordinator
        ('Tutors Coordinator', 'childsmile_app_possible_matches', 'CREATE'),
        ('Tutors Coordinator', 'childsmile_app_possible_matches', 'UPDATE'),
        ('Tutors Coordinator', 'childsmile_app_possible_matches', 'DELETE'),
        ('Tutors Coordinator', 'childsmile_app_possible_matches', 'VIEW'),

        # Matures Coordinator
        ('Matures Coordinator', 'childsmile_app_possible_matches', 'VIEW'),

        # Healthy Kids Coordinator
        ('Healthy Kids Coordinator', 'childsmile_app_possible_matches', 'VIEW'),
    ]

    for role_name, resource, action in permissions:
        role = Role.objects.get(role_name=role_name)
        Permissions.objects.create(role=role, resource=resource, action=action)

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0006_update_family_tables_scheme'),
    ]

    operations = [
        migrations.CreateModel(
            name='PossibleMatches',
            fields=[
                ('match_id', models.AutoField(primary_key=True)),
                ('child_id', models.IntegerField()),
                ('tutor_id', models.IntegerField()),
                ('child_full_name', models.CharField(max_length=255)),
                ('tutor_full_name', models.CharField(max_length=255)),
                ('child_city', models.CharField(max_length=255)),
                ('tutor_city', models.CharField(max_length=255)),
                ('child_age', models.IntegerField()),
                ('tutor_age', models.IntegerField()),
                ('distance_between_cities', models.IntegerField(default=0)),
                ('grade', models.IntegerField()),
                # add a field to indicate the match was used to create a match
                ('is_used', models.BooleanField(default=False)),
            ],
        ),
        migrations.RunPython(add_possible_matches_permissions),
    ]