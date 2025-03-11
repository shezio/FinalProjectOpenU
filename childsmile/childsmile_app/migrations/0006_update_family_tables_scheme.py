from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0005_override_roles_and_permissions'),
    ]

    operations = [
        # Add new columns to the 'children' table
        migrations.AddField(
            model_name='children',
            name='current_medical_state',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='when_completed_treatments',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='father_name',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='father_phone',
            field=models.CharField(max_length=20, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='mother_name',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='mother_phone',
            field=models.CharField(max_length=20, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='street_and_apartment_number',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='expected_end_treatment_by_protocol',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='has_completed_treatments',
            field=models.BooleanField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='children',
            name='is_in_school',
            field=models.BooleanField(null=True, blank=True),
        ),
    ]