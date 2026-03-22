from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from childsmile_app.models import Tasks, AuditLog
from django.db import transaction


class Command(BaseCommand):
    help = 'Delete completed tasks older than 1 week'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to keep (default: 7 days)',
        )

    def handle(self, *args, **options):
        days = options['days']
        
        # Validate days parameter
        if days <= 0:
            self.stdout.write(
                self.style.ERROR('Error: --days must be greater than 0')
            )
            return
        
        # Calculate the cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find and delete completed tasks older than cutoff date
        tasks_to_delete = Tasks.objects.filter(
            status='הושלמה',
            updated_at__lt=cutoff_date
        )
        
        count = tasks_to_delete.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No completed tasks older than {} days found.'.format(days))
            )
            # Log to audit log
            AuditLog.objects.create(
                user_email='system',
                username='scheduler',
                action='CLEANUP_OLD_TASKS',
                endpoint='management_command',
                method='cleanup_old_tasks',
                affected_tables=['childsmile_app_tasks'],
                user_roles=['System'],
                permissions=[],
                status_code=200,
                success=True,
                error_message=None,
                additional_data={'days': days, 'deleted_count': 0},
                description=f'Scheduler: Cleanup old tasks executed. No tasks older than {days} days found.'
            )
            return
        
        # Delete the tasks in a transaction for safety
        try:
            with transaction.atomic():
                # Get all task IDs before deletion for logging
                task_ids = list(tasks_to_delete.values_list('task_id', flat=True))
                
                # Delete the tasks
                deleted_count, _ = tasks_to_delete.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        'Successfully deleted {} completed tasks older than {} days'.format(deleted_count, days)
                    )
                )
                
                # Log to audit log
                AuditLog.objects.create(
                    user_email='system',
                    username='scheduler',
                    action='CLEANUP_OLD_TASKS',
                    endpoint='management_command',
                    method='cleanup_old_tasks',
                    affected_tables=['childsmile_app_tasks'],
                    user_roles=['System'],
                    permissions=[],
                    entity_type='Task',
                    entity_ids=task_ids,
                    status_code=200,
                    success=True,
                    error_message=None,
                    additional_data={'days': days, 'deleted_count': deleted_count, 'task_ids': task_ids},
                    description=f'Scheduler: Cleanup old tasks executed. Deleted {deleted_count} completed tasks older than {days} days.'
                )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during deletion: {str(e)}')
            )
            # Log failure to audit log
            AuditLog.objects.create(
                user_email='system',
                username='scheduler',
                action='CLEANUP_OLD_TASKS_FAILED',
                endpoint='management_command',
                method='cleanup_old_tasks',
                affected_tables=['childsmile_app_tasks'],
                user_roles=['System'],
                permissions=[],
                status_code=500,
                success=False,
                error_message=str(e),
                additional_data={'days': days},
                description=f'Scheduler: Cleanup old tasks FAILED. Error: {str(e)}'
            )
            raise
