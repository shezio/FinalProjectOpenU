# 0029_add_healthy_support.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("childsmile_app", "0028_create_geo_table"),
    ]

    operations = [
        # Create ENUM type for health status
        migrations.RunSQL(
            sql="""
            CREATE TYPE status AS ENUM (
                'טיפולים', 'מעקבים', 'אחזקה', 'מחלים', 'בריא'
            );
            """,
            reverse_sql="""
            DROP TYPE status;
            """
        ),

        # Add status column to Children model using Django's ORM
        migrations.AddField(
            model_name="children",
            name="status",
            field=models.CharField(
                max_length=20,
                default="טיפולים",
                choices=[
                    ("טיפולים", "טיפולים"),
                    ("מעקבים", "מעקבים"),
                    ("אחזקה", "אחזקה"),
                    ("מחלים", "מחלים"),
                    ("בריא", "בריא"),
                ],
                null=False,
                blank=False,
            ),
        ),
        
        # Link the Django field to use the PostgreSQL ENUM type
        migrations.RunSQL(
            sql="""
            ALTER TABLE childsmile_app_children 
            ALTER COLUMN status TYPE status USING status::status;
            """,
            reverse_sql="""
            ALTER TABLE childsmile_app_children 
            ALTER COLUMN status TYPE character varying(20);
            """
        ),

        migrations.AddIndex(
            model_name="children",
            index=models.Index(fields=["status"], name="idx_children_status"),
        ),
    ]