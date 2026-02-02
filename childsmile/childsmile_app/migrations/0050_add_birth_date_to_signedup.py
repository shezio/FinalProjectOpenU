# Migration to add birth_date field to SignedUp table

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('childsmile_app', '0049_children_last_review_talk_conducted'),
    ]

    operations = [
        migrations.AddField(
            model_name='signedup',
            name='birth_date',
            field=models.DateField(null=True, blank=True),
        ),
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS idx_signedup_age ON childsmile_app_signedup (age);',
            reverse_sql='DROP INDEX IF EXISTS idx_signedup_age;',
        ),
        # Index on SignedUp.birth_date for age calculations
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS idx_signedup_birth_date ON childsmile_app_signedup (birth_date);',
            reverse_sql='DROP INDEX IF EXISTS idx_signedup_birth_date;',
        ),
        # Index on Children.date_of_birth for age calculations
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS idx_children_date_of_birth ON childsmile_app_children (date_of_birth);',
            reverse_sql='DROP INDEX IF EXISTS idx_children_date_of_birth;',
        ),
        # Index on PossibleMatches.child_age for matching reports
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS idx_possiblematches_child_age ON childsmile_app_possiblematches (child_age);',
            reverse_sql='DROP INDEX IF EXISTS idx_possiblematches_child_age;',
        ),
        # Index on PossibleMatches.tutor_age for matching reports
        migrations.RunSQL(
            sql='CREATE INDEX IF NOT EXISTS idx_possiblematches_tutor_age ON childsmile_app_possiblematches (tutor_age);',
            reverse_sql='DROP INDEX IF EXISTS idx_possiblematches_tutor_age;',
        ),
    ]
