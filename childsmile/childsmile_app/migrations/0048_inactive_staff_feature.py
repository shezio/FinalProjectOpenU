# Generated migration for Inactive Staff feature
# This migration adds support for deactivating staff members while preserving their data

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0047_remove_healthy_kids_coordinator'),
    ]

    operations = [
        # Add fields to Staff model for inactive staff tracking
        migrations.AddField(
            model_name='staff',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='staff',
            name='previous_roles',
            field=models.JSONField(default=None, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='staff',
            name='deactivation_reason',
            field=models.CharField(max_length=200, null=True, blank=True),
        ),
        # Add field to Tutorships model for tracking tutorship activation status
        migrations.AddField(
            model_name='tutorships',
            name='tutorship_activation',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('pending_first_approval', 'Pending First Approval'),
                    ('active', 'Active'),
                    ('inactive', 'Inactive'),
                ],
                default='pending_first_approval'
            ),
        ),
    ]
