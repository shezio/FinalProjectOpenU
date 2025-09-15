from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0031_add_tut_id_fk_to_prevs"),
    ]

    # add a DateTimeField 'updated' to Tutors and General_Volunteer models
    operations = [
        migrations.AddField(
            model_name="tutors",
            name="updated",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="general_volunteer",
            name="updated",
            field=models.DateTimeField(auto_now=True),
        ),
    ]