from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0033_add_totp_support"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="staff",
            name="password",
        ),
    ]