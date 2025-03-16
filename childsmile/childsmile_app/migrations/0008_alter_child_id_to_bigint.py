# 0008_alter_child_id_to_bigint.py
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0007_add_possible_matches_table'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE childsmile_app_children ALTER COLUMN child_id TYPE BIGINT;
                ALTER TABLE childsmile_app_tutorships ALTER COLUMN child_id TYPE BIGINT;
                ALTER TABLE childsmile_app_possiblematches ALTER COLUMN child_id TYPE BIGINT;
                ALTER TABLE childsmile_app_healthy ALTER COLUMN child_id_id TYPE BIGINT;
                ALTER TABLE childsmile_app_matures ALTER COLUMN child_id TYPE BIGINT;
            """,
            reverse_sql="""
                ALTER TABLE childsmile_app_children ALTER COLUMN child_id TYPE INTEGER;
                ALTER TABLE childsmile_app_tutorships ALTER COLUMN child_id TYPE INTEGER;
                ALTER TABLE childsmile_app_possiblematches ALTER COLUMN child_id TYPE INTEGER;
                ALTER TABLE childsmile_app_healthy ALTER COLUMN child_id_id TYPE INTEGER;
                ALTER TABLE childsmile_app_matures ALTER COLUMN child_id TYPE INTEGER;
            """,
        ),
    ]