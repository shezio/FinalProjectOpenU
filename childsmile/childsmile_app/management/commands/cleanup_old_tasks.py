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
        
        # Find tasks to delete
        tasks_to_delete = Tasks.objects.filter(
            status='הושלמה',
            updated_at__lt=cutoff_date
        )
        
        count = tasks_to_delete.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('No completed tasks older than {} days found.'.format(days))
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
                
                # Log to audit log (non-critical, don't fail if audit fails)
                try:
                    # Build description based on whether all tasks were deleted
                    if deleted_count == count:
                        description = f'{deleted_count} מתוך {count} משימות שהושלמו נוקו בהצלחה'
                    else:
                        description = f'{deleted_count} מתוך {count} משימות שהושלמו נוקו בהצלחה'
                    
                    AuditLog.objects.create(
                        user_email='system',
                        username='scheduler',
                        action='CLEANUP_TASKS',
                        endpoint='management_command',
                        method='DELETE',
                        affected_tables=['childsmile_app_tasks'],
                        user_roles=['System'],
                        permissions=['System'],
                        entity_type='Task',
                        entity_ids=task_ids[:100] if len(task_ids) > 100 else task_ids,  # Cap IDs for readability
                        status_code=200,
                        success=True,
                        error_message=None,
                        additional_data={
                            'days': days, 
                            'deleted_count': deleted_count, 
                            'task_ids_count': len(task_ids)
                        },
                        description=description
                    )
                except Exception as audit_error:
                    self.stdout.write(
                        self.style.WARNING(f'Warning: Could not log to audit: {str(audit_error)}')
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during deletion: {str(e)}')
            )
            # Log failure to audit log (best-effort, don't fail if audit fails)
            try:
                # Calculate how many failed
                failed_count = count  # All tasks that were attempted to delete
                
                description = f'{failed_count} מתוך {count} משימות שהושלמו נוקו - שגיאה: {str(e)}'
                
                AuditLog.objects.create(
                    user_email='system',
                    username='scheduler',
                    action='CLEANUP_TASKS_FAILED',
                    endpoint='management_command',
                    method='DELETE',
                    affected_tables=['childsmile_app_tasks'],
                    user_roles=['System'],
                    permissions=['System'],
                    status_code=500,
                    success=False,
                    error_message=str(e),
                    additional_data={'days': days, 'attempted_count': count},
                    description=description
                )
            except Exception as audit_error:
                self.stdout.write(
                    self.style.WARNING(f'Warning: Could not log failure to audit: {str(audit_error)}')
                )
            raise
