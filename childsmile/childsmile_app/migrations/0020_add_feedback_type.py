from django.db import migrations, models
from django.db.models import CharField, TextField

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0019_remove_view_perm_from_fededbacks"),
    ]

    operations = [
        migrations.AddField(
            model_name="feedback",
            name="feedback_type",
            field=models.CharField(
                max_length=50,
                choices=[
                    ("tutor_fun_day", "Tutor Fun Day"),
                    ("general_volunteer_fun_day", "General Volunteer Fun Day"),
                    ("general_volunteer_hospital_visit", "General Volunteer Hospital Visit"),
                    ("tutorship", "Tutorship"),
                ],
                default="tutorship",
                null=False,
                blank=False,
            ),
        ),
    ]