from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0037_index_desc_audit'),
    ]

    # add table for audit action translations
    operations = [
        migrations.CreateModel(
            name='AuditTranslation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=100, unique=True)),
                ('hebrew_translation', models.CharField(max_length=255)),
            ],
        ),
    ]