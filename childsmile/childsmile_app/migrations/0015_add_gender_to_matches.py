from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0014_make_signedup_id_manual"),
    ]

    operations = [
        migrations.AddField(
            model_name="possiblematches",
            name="child_gender",
            field=models.BooleanField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name="possiblematches",
            name="tutor_gender",
            field=models.BooleanField(null=True, blank=True),
        ),
    ]