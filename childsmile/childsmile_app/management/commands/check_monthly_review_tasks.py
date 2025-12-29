"""
Management command to check and create monthly family review tasks.

Run daily (preferably early morning) via cron or Azure scheduling:
    python manage.py check_monthly_review_tasks

This will:
1. Check all active families
2. For families with no review task in past 30 days, create a new task
3. Log statistics about the operation
"""

from django.core.management.base import BaseCommand
from childsmile_app.monthly_tasks import check_and_create_monthly_review_tasks
from childsmile_app.logger import api_logger


class Command(BaseCommand):
    help = 'Check and create monthly family review tasks for families that need follow-up'

    def handle(self, *args, **options):
        self.stdout.write('Starting monthly review task check...')
        
        try:
            result = check_and_create_monthly_review_tasks()
            
            # Display results
            self.stdout.write(f"\nResults:")
            self.stdout.write(f"  Status: {result.get('status')}")
            self.stdout.write(f"  Families checked: {result.get('families_checked')}")
            self.stdout.write(f"  Tasks created: {result.get('tasks_created')}")
            self.stdout.write(f"  Tasks skipped: {result.get('tasks_skipped')}")
            self.stdout.write(f"  Errors: {result.get('errors')}")
            
            if result.get('status') == 'completed':
                self.stdout.write(self.style.SUCCESS('\n✅ Monthly review task check completed successfully'))
            else:
                self.stdout.write(self.style.WARNING(f"\n⚠️ Monthly review task check completed with status: {result.get('status')}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error during monthly review task check: {str(e)}'))
            api_logger.error(f'Management command error: {str(e)}')
            raise
