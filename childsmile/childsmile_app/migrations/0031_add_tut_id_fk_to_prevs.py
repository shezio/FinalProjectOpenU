from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0030_newmodel_prevtutorshipstatuses"),
    ]

    operations = [
        migrations.AddField(
            model_name="prevtutorshipstatuses",
            name="tutorship_id",
            field=models.ForeignKey(
                to="childsmile_app.Tutorships",
                on_delete=models.CASCADE,
                null=True,  # Use null=True for backward compatibility
            ),
        ),
    ]