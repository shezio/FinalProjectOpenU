from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from childsmile_app.models import Task


class Command(BaseCommand):
    help = 'Delete completed tasks older than 1 week'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to keep (default: 7 days)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        # Calculate the cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find tasks to delete
        tasks_to_delete = Task.objects.filter(
            status='הושלמה',
            updated_at__lt=cutoff_date
        )
        
        count = tasks_to_delete.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No completed tasks older than {} days found.'.format(days))
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    'DRY RUN: Would delete {} completed tasks older than {} days'.format(count, days)
                )
            )
            # Show sample tasks
            self.stdout.write('\nSample tasks to be deleted:')
            for task in tasks_to_delete[:5]:
                self.stdout.write(
                    '  - ID: {}, Status: {}, Updated: {}'.format(
                        task.id, task.status, task.updated_at
                    )
                )
            if count > 5:
                self.stdout.write('  ... and {} more'.format(count - 5))
        else:
            # Actually delete the tasks
            tasks_to_delete.delete()
            self.stdout.write(
                self.style.SUCCESS(
                    'Successfully deleted {} completed tasks older than {} days'.format(count, days)
                )
            )
