from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0025_tech_feature"),
    ]

    operations = [
    # add fields to Tasks model
        migrations.AlterField(
            model_name="tasks",
            name="initial_family_data_id_fk",
            field=models.ForeignKey(
                to="childsmile_app.initialfamilydata",
                on_delete=models.CASCADE,
                null=True,
                blank=True,
                db_column="initial_family_data_id_fk",
            ),
        ),
    ]