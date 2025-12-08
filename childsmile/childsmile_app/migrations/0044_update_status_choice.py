# Generated migration to update status choice from מחלים to ז״ל

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0043_add_tutored_families_coordinator'),
    ]

    operations = [
        # Recreate the enum type with the new value instead of the old one
        migrations.RunSQL(
            sql="""
            BEGIN;
            -- Rename the old enum type
            ALTER TYPE status RENAME TO status_old;
            
            -- Create new enum type with updated values
            CREATE TYPE status AS ENUM (
                'טיפולים', 'מעקבים', 'אחזקה', 'ז״ל', 'בריא'
            );
            
            -- Convert the column to the new type
            ALTER TABLE childsmile_app_children 
            ALTER COLUMN status TYPE status USING (status::text)::status;
            
            -- Drop the old enum type
            DROP TYPE status_old;
            COMMIT;
            """,
            reverse_sql="""
            BEGIN;
            -- Rename the new enum type
            ALTER TYPE status RENAME TO status_new;
            
            -- Recreate old enum type with original values
            CREATE TYPE status AS ENUM (
                'טיפולים', 'מעקבים', 'אחזקה', 'מחלים', 'בריא'
            );
            
            -- Convert the column back to the old type
            ALTER TABLE childsmile_app_children 
            ALTER COLUMN status TYPE status USING (status::text)::status;
            
            -- Drop the new enum type
            DROP TYPE status_new;
            COMMIT;
            """
        ),
    ]
