from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0012_add_tutorship_created_date"),  # Adjust this to match your last migration
    ]

    operations = [
        migrations.AddField(
            model_name="tasks",
            name="pending_tutor_id",
            field=models.ForeignKey(
                to="childsmile_app.Pending_Tutor",
                on_delete=models.CASCADE,
                null=True,
                blank=True,
            ),
        ),
    ]