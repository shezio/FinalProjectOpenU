from django.db import migrations, models
from django.core.validators import MinValueValidator, MaxValueValidator  # Import validators

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0013_add_pending_tutor_id"),  # Update with your actual dependency
    ]

    operations = [
        # Remove the auto-generation constraint and add manual ID validation
        migrations.AlterField(
            model_name="signedup",
            name="id",
            field=models.BigIntegerField(
                primary_key=True,
                unique=True,
                validators=[
                    MinValueValidator(100000000),  # Ensure ID is at least 9 digits
                    MaxValueValidator(999999999),  # Ensure ID is at most 9 digits
                ],
            ),
        ),
    ]