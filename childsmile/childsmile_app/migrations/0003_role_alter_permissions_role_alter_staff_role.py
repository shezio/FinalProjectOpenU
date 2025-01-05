# 0003_role_alter_permissions_role_alter_staff_role.py
import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0002_task'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permissions',
            name='role',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Role'),
        ),
        migrations.AlterField(
            model_name='staff',
            name='role',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='childsmile_app.Role'),
        ),
    ]