# file: 0000_createdbtables.py
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Permissions",
            fields=[
                ("permission_id", models.AutoField(primary_key=True)),
                ("role", models.CharField(max_length=255)),
                ("resource", models.CharField(max_length=255)),
                ("action", models.CharField(max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name="Role",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                ("role_name", models.CharField(max_length=255, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name="Staff",
            fields=[
                ("staff_id", models.AutoField(primary_key=True)),
                ("username", models.CharField(max_length=255, unique=True)),
                ("password", models.CharField(max_length=255)),
                (
                    "role",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Role",
                    ),
                ),
                ("email", models.EmailField(max_length=255, unique=True)),
                ("first_name", models.CharField(max_length=255)),
                ("last_name", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="SignedUp",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                ("first_name", models.CharField(max_length=255)),
                ("surname", models.CharField(max_length=255)),
                ("age", models.IntegerField()),
                ("gender", models.BooleanField()),
                ("phone", models.CharField(max_length=20)),
                ("city", models.CharField(max_length=255)),
                ("comment", models.TextField(null=True, blank=True)),
                ("email", models.EmailField(null=True, blank=True)),
                ("want_tutor", models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name="General_Volunteer",
            fields=[
                (
                    "id",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.SignedUp",
                    ),
                ),
                (
                    "staff",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("signupdate", models.DateField()),
                ("comments", models.TextField(null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name="Pending_Tutor",
            fields=[
                ("pending_tutor_id", models.AutoField(primary_key=True)),
                (
                    "id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.SignedUp",
                    ),
                ),
                ("pending_status", models.CharField(max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name="Tutors",
            fields=[
                (
                    "id",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.SignedUp",
                    ),
                ),
                (
                    "staff",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                (
                    "tutorship_status",
                    models.CharField(
                        max_length=255,
                        choices=[
                            ('HAS_TUTEE', 'Has Tutee'),
                            ('NO_TUTEE', 'No Tutee'),
                            ('NOT_AVAILABLE', 'Not Available for Assignment')
                        ]
                    )
                ),
                (
                    "preferences",
                    models.TextField(null=True, blank=True),
                ),
                ("tutor_email", models.EmailField(null=True, blank=True)),
                (
                    "relationship_status",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                (
                    "tutee_wellness",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Children",
            fields=[
                ("child_id", models.AutoField(primary_key=True)),
                ("childfirstname", models.CharField(max_length=255)),
                ("childsurname", models.CharField(max_length=255)),
                ("registrationdate", models.DateField()),
                ("lastupdateddate", models.DateField(auto_now=True)),
                ("gender", models.BooleanField()),
                ("responsible_coordinator", models.CharField(max_length=255)),
                ("city", models.CharField(max_length=255)),
                ("child_phone_number", models.CharField(max_length=20)),
                ("treating_hospital", models.CharField(max_length=255)),
                ("date_of_birth", models.DateField()),
                (
                    "medical_diagnosis",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("diagnosis_date", models.DateField(null=True, blank=True)),
                ("marital_status", models.CharField(max_length=50)),
                ("num_of_siblings", models.IntegerField()),
                ("details_for_tutoring", models.TextField()),
                (
                    "additional_info",
                    models.TextField(null=True, blank=True),
                ),
                ("tutoring_status", models.CharField(max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name="Tutorships",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                (
                    "child",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Children",
                    ),
                ),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Tutors",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Matures",
            fields=[
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                (
                    "child",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.Children",
                    ),
                ),
                ("full_address", models.CharField(max_length=255)),
                (
                    "current_medical_state",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("when_completed_treatments", models.DateField(null=True, blank=True)),
                ("parent_name", models.CharField(max_length=255)),
                ("parent_phone", models.CharField(max_length=20)),
                (
                    "additional_info",
                    models.TextField(null=True, blank=True),
                ),
                (
                    "general_comment",
                    models.TextField(null=True, blank=True),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Healthy",
            fields=[
                (
                    "child_id",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.Children",
                    ),
                ),
                (
                    "street_and_apartment_number",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                (
                    "father_name",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("father_phone", models.CharField(max_length=20, null=True, blank=True)),
                (
                    "mother_name",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("mother_phone", models.CharField(max_length=20, null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("feedback_id", models.AutoField(primary_key=True)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("event_date", models.DateTimeField()),
                (
                    "staff",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("description", models.TextField()),
                (
                    "exceptional_events",
                    models.TextField(null=True, blank=True),
                ),
                (
                    "anything_else",
                    models.TextField(null=True, blank=True),
                ),
                ("comments", models.TextField(null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name="Tutor_Feedback",
            fields=[
                (
                    "feedback_id",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.Feedback",
                    ),
                ),
                ("tutee_name", models.CharField(max_length=255)),
                ("tutor_name", models.CharField(max_length=255)),
                (
                    "tutor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Tutors",
                    ),
                ),
                ("is_it_your_tutee", models.BooleanField()),
                ("is_first_visit", models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name="General_V_Feedback",
            fields=[
                (
                    "feedback_id",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        to="childsmile_app.Feedback",
                    ),
                ),
                ("volunteer_name", models.CharField(max_length=255)),
                (
                    "volunteer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.General_Volunteer",
                    ),
                ),
            ],
        ),
    ]