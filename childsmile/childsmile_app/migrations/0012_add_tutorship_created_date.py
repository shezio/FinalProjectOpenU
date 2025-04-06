from django.db import migrations, models
import datetime

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0011_add_indexes_to_tasks"),
    ]

    operations = [
        migrations.AddField(
            model_name="tutorships",
            name="created_date",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.RunSQL(
            sql="UPDATE childsmile_app_tutorships SET created_date = NOW() WHERE created_date IS NULL;",
            reverse_sql="UPDATE childsmile_app_tutorships SET created_date = NULL;",
        ),
        migrations.AddIndex(
            model_name="tutorships",
            index=models.Index(
                fields=["created_date"], name="idx_tutorships_created_date"
            ),
        ),
    ]