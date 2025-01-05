# 0004_role_alter_permissions_role_alter_staff_role.py

import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0003_task'),
    ]

    operations = [
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role_name', models.CharField(max_length=255, unique=True)),
            ],
        ),
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