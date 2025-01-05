# 0000_createdbtables.py

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
            name="Staff",
            fields=[
                ("staff_id", models.AutoField(primary_key=True)),
                ("username", models.CharField(max_length=255, unique=True)),
                ("password", models.CharField(max_length=255)),
                (
                    "role_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Permissions",
                    ),
                ),
                ("email", models.EmailField(max_length=255, unique=True)),
                ("firstname", models.CharField(max_length=255)),
                ("lastname", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="SignedUp",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                ("firstname", models.CharField(max_length=255)),
                ("surname", models.CharField(max_length=255)),
                ("age", models.IntegerField()),
                ("gender", models.BooleanField()),
                ("phone", models.IntegerField()),
                ("city", models.CharField(max_length=255)),
                ("comment", models.CharField(max_length=255, null=True, blank=True)),
                ("email", models.EmailField(null=True, blank=True)),
                ("want_tutor", models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name="GeneralVolunteer",
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
                    "staff_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("signupdate", models.DateField()),
                ("comments", models.CharField(max_length=255, null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name="PendingTutor",
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
                    "staff_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("tutorship_status", models.CharField(max_length=255)),
                (
                    "preferences",
                    models.CharField(max_length=255, null=True, blank=True),
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
                ("child_phone_number", models.IntegerField()),
                ("treating_hospital", models.CharField(max_length=255)),
                ("date_of_birth", models.DateField()),
                ("age", models.IntegerField()),
                (
                    "medical_diagnosis",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("diagnosis_date", models.DateField(null=True, blank=True)),
                ("marital_status", models.CharField(max_length=255)),
                ("num_of_siblings", models.IntegerField()),
                ("details_for_tutoring", models.CharField(max_length=255)),
                (
                    "additional_info",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("tutoring_status", models.CharField(max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name="Tutorships",
            fields=[
                ("id", models.AutoField(primary_key=True)),
                (
                    "child_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Children",
                    ),
                ),
                (
                    "tutor_id",
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
                    "child_id",
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
                ("parent_phone", models.IntegerField()),
                (
                    "additional_info",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                (
                    "general_comment",
                    models.CharField(max_length=255, null=True, blank=True),
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
                ("father_phone", models.IntegerField(null=True, blank=True)),
                (
                    "mother_name",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("mother_phone", models.IntegerField(null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name="Feedback",
            fields=[
                ("feedback_id", models.AutoField(primary_key=True)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("event_date", models.DateTimeField()),
                (
                    "staff_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                (
                    "exceptional_events",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                (
                    "anything_else",
                    models.CharField(max_length=255, null=True, blank=True),
                ),
                ("comments", models.CharField(max_length=255, null=True, blank=True)),
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
                    "tutor_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Tutors",
                    ),
                ),
                ("is_it_your_tutee", models.BooleanField()),
                ("isfirstvisit", models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name="GeneralVFeedback",
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
                    "volunteer_id",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.GeneralVolunteer",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="TaskTypes",
            fields=[
                ("task_type", models.AutoField(primary_key=True)),
                ("task_name", models.CharField(max_length=255)),
            ],
        ),
        migrations.CreateModel(
            name="Tasks",
            fields=[
                ("task_id", models.AutoField(primary_key=True)),
                (
                    "staff_member",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.Staff",
                    ),
                ),
                ("task_description", models.CharField(max_length=255)),
                ("due_date", models.DateField()),
                ("status", models.CharField(max_length=255, default="לביצוע")),
                (
                    "task_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="childsmile_app.TaskTypes",
                    ),
                ),
            ],
        ),
    ]
