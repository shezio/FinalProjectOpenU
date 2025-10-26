from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0035_audit_support'),
    ]

    # add report_name and description fields to AuditLog model
    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='report_name',
            field=models.CharField(max_length=255, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='auditlog',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
    ]