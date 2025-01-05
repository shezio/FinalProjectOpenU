# 0002_initial.py

import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('childsmile_app', '0001_runSQLs'),
    ]

    operations = [
        migrations.CreateModel(
            name='Family',
            fields=[
                ('family_id', models.AutoField(primary_key=True, serialize=False)),
                ('family_name', models.CharField(max_length=255)),
                ('address', models.CharField(max_length=255)),
                ('city', models.CharField(max_length=255)),
                ('phone_number', models.CharField(max_length=20)),
                ('email', models.EmailField(max_length=255, unique=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='Volunteer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=255)),
                ('last_name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('phone_number', models.CharField(max_length=20)),
                ('active', models.BooleanField(default=True)),
                ('departed', models.BooleanField(default=False)),
            ],
        ),
        migrations.CreateModel(
            name='FamilyMember',
            fields=[
                ('member_id', models.AutoField(primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=255)),
                ('last_name', models.CharField(max_length=255)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(max_length=10)),
                ('relationship_to_family', models.CharField(max_length=255)),
                ('phone_number', models.CharField(max_length=20)),
                ('email', models.EmailField(blank=True, max_length=255, null=True, unique=True)),
                ('additional_info', models.TextField(blank=True, null=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to='childsmile_app.Family')),
            ],
        ),
        migrations.CreateModel(
            name='HealthyKid',
            fields=[
                ('healthy_kid_id', models.AutoField(primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=255)),
                ('last_name', models.CharField(max_length=255)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(max_length=10)),
                ('phone_number', models.CharField(max_length=20)),
                ('email', models.EmailField(blank=True, max_length=255, null=True, unique=True)),
                ('address', models.CharField(max_length=255)),
                ('city', models.CharField(max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='healthy_kids', to='childsmile_app.Family')),
            ],
        ),
        migrations.CreateModel(
            name='Mature',
            fields=[
                ('mature_id', models.AutoField(primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=255)),
                ('last_name', models.CharField(max_length=255)),
                ('date_of_birth', models.DateField()),
                ('gender', models.CharField(max_length=10)),
                ('phone_number', models.CharField(max_length=20)),
                ('email', models.EmailField(blank=True, max_length=255, null=True, unique=True)),
                ('address', models.CharField(max_length=255)),
                ('city', models.CharField(max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('family', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='matures', to='childsmile_app.Family')),
            ],
        ),
        migrations.CreateModel(
            name='Staff',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('staff_id', models.AutoField(primary_key=True, serialize=False)),
                ('username', models.CharField(max_length=255, unique=True)),
                ('email', models.EmailField(max_length=255, unique=True)),
                ('firstname', models.CharField(max_length=255)),
                ('lastname', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('role', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Permissions')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Feedback',
            fields=[
                ('feedback_id', models.AutoField(primary_key=True, serialize=False)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('event_date', models.DateTimeField()),
                ('description', models.TextField()),
                ('exceptional_events', models.TextField(blank=True, null=True)),
                ('anything_else', models.TextField(blank=True, null=True)),
                ('comments', models.TextField(blank=True, null=True)),
                ('reviewed', models.BooleanField(default=False)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Staff')),
            ],
        ),
        migrations.CreateModel(
            name='Tutor',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('tutorship_status', models.CharField(choices=[('יש_חניך', 'Has Tutee'), ('אין_חניך', 'No Tutee'), ('לא_זמין_לשיבוץ', 'Not Available for Assignment')], max_length=20)),
                ('preferences', models.TextField(blank=True, null=True)),
                ('tutor_email', models.EmailField(blank=True, max_length=255, null=True)),
                ('relationship_status', models.CharField(blank=True, max_length=255, null=True)),
                ('tutee_wellness', models.CharField(blank=True, max_length=255, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Staff')),
            ],
        ),
        migrations.CreateModel(
            name='Tutorship',
            fields=[
                ('tutorship_id', models.AutoField(primary_key=True, serialize=False)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('HAS_TUTEE', 'Has Tutee'), ('NO_TUTEE', 'No Tutee'), ('NOT_AVAILABLE', 'Not Available for Assignment')], default='NO_TUTEE', max_length=20)),
                ('geographic_proximity', models.FloatField(blank=True, null=True)),
                ('gender_match', models.BooleanField(default=False)),
                ('family_member', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.FamilyMember')),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Tutor')),
            ],
        ),
        migrations.CreateModel(
            name='TutorFeedback',
            fields=[
                ('feedback', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, serialize=False, to='childsmile_app.Feedback')),
                ('tutee_name', models.CharField(max_length=255)),
                ('is_it_your_tutee', models.BooleanField()),
                ('is_first_visit', models.BooleanField()),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Tutor')),
            ],
        ),
        migrations.CreateModel(
            name='VolunteerFeedback',
            fields=[
                ('feedback', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, primary_key=True, serialize=False, to='childsmile_app.Feedback')),
                ('volunteer_name', models.CharField(max_length=255)),
                ('volunteer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Volunteer')),
            ],
        ),
    ]