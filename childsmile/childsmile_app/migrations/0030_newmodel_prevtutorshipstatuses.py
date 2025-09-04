from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0029_add_healthy_support"),
    ]

    operations = [
        migrations.CreateModel(
            name="PrevTutorshipStatuses",
            fields=[
                ("prev_id", models.AutoField(primary_key=True, serialize=False)),
                ("tutor_id", models.ForeignKey(to="childsmile_app.Tutors", on_delete=models.CASCADE, null=False)),
                ("child_id", models.ForeignKey(to="childsmile_app.Children", on_delete=models.CASCADE, null=False)),
                ("tutor_tut_status", models.CharField(max_length=50, null=False)),
                ("child_tut_status", models.CharField(max_length=50, null=False)),
                ("last_updated", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]