from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0027_rem_del_crt_not_cos"),
    ]

    operations = [
        migrations.CreateModel(
            name="CityGeoDistance",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("city1", models.CharField(max_length=255, db_index=True)),
                ("city2", models.CharField(max_length=255, db_index=True)),
                ("city1_latitude", models.FloatField(null=True, blank=True)),
                ("city1_longitude", models.FloatField(null=True, blank=True)),
                ("city2_latitude", models.FloatField(null=True, blank=True)),
                ("city2_longitude", models.FloatField(null=True, blank=True)),
                ("distance", models.IntegerField(null=True, blank=True)),  # in km
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "childsmile_app_citygeodistance",
                "unique_together": {("city1", "city2")},
                "indexes": [
                    models.Index(fields=["city1", "city2"], name="idx_city1_city2"),
                ],
            },
        ),
    ]