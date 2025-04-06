# filepath: c:\Dev\FinalProjectOpenU\childsmile\childsmile_app\migrations\0011_add_indexes_to_tasks.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0011_add_indexes_to_tasks"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorships",
            name="created_date",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddIndex(
            model_name="tutorships",
            index=models.Index(
                fields=["created_date"], name="idx_tutorships_created_date"
            ),
        ),
    ]
