from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0034_rem_password'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('audit_id', models.AutoField(primary_key=True, serialize=False)),
                ('user_email', models.EmailField(db_index=True, max_length=255)),
                ('username', models.CharField(db_index=True, max_length=150)),
                ('timestamp', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('action', models.CharField(db_index=True, max_length=100)),
                ('endpoint', models.CharField(max_length=255)),
                ('method', models.CharField(max_length=10)),
                ('affected_tables', models.JSONField(default=list)),
                ('user_roles', models.JSONField(default=list)),
                ('permissions', models.JSONField(default=list)),
                ('entity_type', models.CharField(blank=True, max_length=100, null=True)),
                ('entity_ids', models.JSONField(default=list)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, null=True)),
                ('status_code', models.IntegerField(blank=True, null=True)),
                ('success', models.BooleanField(default=True)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('additional_data', models.JSONField(blank=True, default=dict, null=True)),
            ],
            options={
                'db_table': 'audit_log',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['timestamp', 'user_email'], name='childsmile_app_auditlog_timestamp_user_email_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action', 'timestamp'], name='childsmile_app_auditlog_action_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['entity_type', 'timestamp'], name='childsmile_app_auditlog_entity_type_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['success', 'timestamp'], name='childsmile_app_auditlog_success_timestamp_idx'),
        ),
    ]