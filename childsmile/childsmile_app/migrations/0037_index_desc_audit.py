from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0036_audit_add_fields'),
    ]

    # add index on description field
    operations = [
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['description'], name='idx_auditlog_description'),
        ),
    ]