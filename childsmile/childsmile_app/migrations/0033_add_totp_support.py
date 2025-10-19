from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0032_add_updatedcol_to_tutors_volunteers_tables"),
    ]

    operations = [
        migrations.CreateModel(
            name='TOTPCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254)),
                ('code', models.CharField(max_length=6)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('used', models.BooleanField(default=False)),
                ('attempts', models.IntegerField(default=0)),
            ],
            options={
                'db_table': 'totp_codes',
            },
        ),
    ]