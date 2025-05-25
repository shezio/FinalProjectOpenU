from django.db import migrations, models

class Migration(migrations.Migration):


    dependencies = [
        ("childsmile_app", "0023_rem_delete_perms"),
    ]

    operations = [
        # add child_name column to gv_feedbacks table
        migrations.AddField(
            model_name="General_V_Feedback",
            name="child_name",
            field=models.CharField(
                max_length=255,
                null=True,
                blank=True,
                verbose_name="Child Name"
            ),
        ),
    ]