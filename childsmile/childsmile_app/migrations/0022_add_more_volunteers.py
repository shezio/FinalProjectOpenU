from django.db import migrations, models
from django.db.models import CharField, TextField

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0021_add_hospital_name"),
    ]

    operations = [
        migrations.AddField(
            # add a field that stores multiple names of volunteers and tutors
            # from all over the system
            # this field is a list of names
            # the field is a TextField that stores a comma-separated list of names
            model_name="feedback",
            name="additional_volunteers",
            field=models.TextField(
                null=True,
                blank=True,
            ),
        ),
    ]