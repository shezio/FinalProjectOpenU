# 0001_runSQLs.py

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('childsmile_app', '0000_createdbtables'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TYPE tutorship_status AS ENUM ('יש_חניך', 'אין_חניך', 'לא_זמין_לשיבוץ');
            CREATE TYPE marital_status AS ENUM ('נשואים', 'גרושים', 'פרודים', 'אין');
            CREATE TYPE tutoring_status AS ENUM (
                'למצוא_חונך', 'לא_רוצים', 'לא_רלוונטי', 'בוגר', 'יש_חונך',
                'למצוא_חונך_אין_באיזור_שלו', 'למצוא_חונך_בעדיפות_גבוה', 'שידוך_בסימן_שאלה'
            );
            """,
            reverse_sql="""
            DROP TYPE tutorship_status;
            DROP TYPE marital_status;
            DROP TYPE tutoring_status;
            """,
        ),
        migrations.RunSQL(
            sql="""
            CREATE OR REPLACE FUNCTION add_to_pending_tutor()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.want_tutor = TRUE THEN
                    INSERT INTO pending_tutor (id, pending_status)
                    VALUES (NEW.id, 'Pending');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trigger_add_to_pending_tutor
            AFTER INSERT ON SignedUp
            FOR EACH ROW
            EXECUTE FUNCTION add_to_pending_tutor();

            CREATE OR REPLACE FUNCTION add_to_general_volunteer()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.want_tutor = FALSE THEN
                    INSERT INTO general_volunteer (id, signupdate, comments)
                    VALUES (NEW.id, CURRENT_DATE, NEW.comment);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trigger_add_to_general_volunteer
            AFTER INSERT ON SignedUp
            FOR EACH ROW
            EXECUTE FUNCTION add_to_general_volunteer();

            CREATE OR REPLACE FUNCTION validate_pending_tutor()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pending_tutor WHERE id = NEW.id) THEN
                    RAISE EXCEPTION 'Tutor must exist in pending_tutor table before being added to Tutors table';
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trigger_validate_pending_tutor
            BEFORE INSERT ON Tutors
            FOR EACH ROW
            EXECUTE FUNCTION validate_pending_tutor();

            CREATE OR REPLACE FUNCTION update_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.timestamp = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER set_timestamp
            BEFORE UPDATE ON Feedback
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
            """,
            reverse_sql="""
            DROP TRIGGER IF EXISTS trigger_add_to_pending_tutor ON SignedUp;
            DROP FUNCTION IF EXISTS add_to_pending_tutor;

            DROP TRIGGER IF EXISTS trigger_add_to_general_volunteer ON SignedUp;
            DROP FUNCTION IF EXISTS add_to_general_volunteer;

            DROP TRIGGER IF EXISTS trigger_validate_pending_tutor ON Tutors;
            DROP FUNCTION IF EXISTS validate_pending_tutor;

            DROP TRIGGER IF EXISTS set_timestamp ON Feedback;
            DROP FUNCTION IF EXISTS update_timestamp;
            """,
        ),
    ]
