from django.db import migrations, models
from django.db.models import CharField, TextField

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0020_add_feedback_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="feedback",
            name="hospital_name",
            field=models.CharField(
                max_length=50,
                null=True,
                blank=True,
            ),
        ),
    ]