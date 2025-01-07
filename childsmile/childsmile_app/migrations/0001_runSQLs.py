from django.db import migrations, models
from django.apps import apps
from datetime import date


def add_to_pending_tutor(sender, instance, created, **kwargs):
    if created and instance.want_tutor:
        Pending_Tutor = apps.get_model('childsmile_app', 'Pending_Tutor')
        Pending_Tutor.objects.create(id=instance, pending_status='Pending')

def add_to_general_volunteer(sender, instance, created, **kwargs):
    if created and not instance.want_tutor:
        General_Volunteer = apps.get_model('childsmile_app', 'General_Volunteer')
        General_Volunteer.objects.create(id=instance, staff=None, signupdate=date.today(), comments=instance.comment)

def validate_pending_tutor(sender, instance, **kwargs):
    Pending_Tutor = apps.get_model('childsmile_app', 'Pending_Tutor')
    if not Pending_Tutor.objects.filter(id=instance.id).exists():
        raise ValueError('Tutor must exist in pending_tutor table before being added to Tutors table')

def update_timestamp(sender, instance, **kwargs):
    instance.timestamp = date.today()


def create_signals(apps, schema_editor):
    from django.db.models.signals import post_save, pre_save
    from datetime import date
    SignedUp = apps.get_model('childsmile_app', 'SignedUp')
    Tutors = apps.get_model('childsmile_app', 'Tutors')
    Feedback = apps.get_model('childsmile_app', 'Feedback')

    # Connect signals
    post_save.connect(add_to_pending_tutor, sender=SignedUp)
    post_save.connect(add_to_general_volunteer, sender=SignedUp)
    pre_save.connect(validate_pending_tutor, sender=Tutors)
    pre_save.connect(update_timestamp, sender=Feedback)


def remove_signals(apps, schema_editor):
    from django.db.models.signals import post_save, pre_save
    SignedUp = apps.get_model('childsmile_app', 'SignedUp')
    Tutors = apps.get_model('childsmile_app', 'Tutors')
    Feedback = apps.get_model('childsmile_app', 'Feedback')

    # Disconnect signals
    post_save.disconnect(add_to_pending_tutor, sender=SignedUp)
    post_save.disconnect(add_to_general_volunteer, sender=SignedUp)
    pre_save.disconnect(validate_pending_tutor, sender=Tutors)
    pre_save.disconnect(update_timestamp, sender=Feedback)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('childsmile_app', '0000_createdbtables'),
    ]

    operations = [
        # Create ENUM types
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
        # Add signals to replace triggers
        migrations.RunPython(
            code=create_signals,
            reverse_code=remove_signals,
        ),
    ]