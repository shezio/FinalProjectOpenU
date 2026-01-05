from django.utils import timezone
from datetime import datetime, timedelta
from calendar import monthrange
import os
import pytz
from .models import Tasks, Task_Types, Staff, Role, Children, AuditLog
from .logger import api_logger

# Monthly family review talk task creation
# Runs automatically daily at 4:00 AM Israel time to check families that need a monthly review talk task

def check_and_create_monthly_review_tasks():
    """
    Check all families and create review tasks for those where a month has passed since last talk.
    
    AUTOMATIC SCHEDULING: Runs automatically daily at 4:00 AM Israel time (set via MONTHLY_CREATOR_TIME env var).
    - Set MONTHLY_CREATOR_TIME='04:00' to enable 4:00 AM Israel time checks
    - If not set or empty, feature is completely disabled
    - In Azure: Add MONTHLY_CREATOR_TIME='04:00' to Application Settings
    - Locally: Set in .env file
    
    TASK CREATION: Creates ONE task per family per Technical Coordinator.
    - All active Technical Coordinators get assigned the task for the family
    - Each coordinator sees the same family's review task
    - Task includes child name and last review date
    
    Logic:
    - Check if current time is within 4:00-4:05 AM Israel time (if not, skip)
    - Query all active children
    - For each child:
      - Check if last_review_talk_conducted is more than 30 days ago (or null)
      - If yes, create ONE task per Technical Coordinator
      - Prevent duplicates by checking if INCOMPLETE task already exists FOR THAT COORDINATOR
      - If a task was completed (הושלמה), a new one will be created after 30 days
    - Update last_review_talk_conducted when task is completed (in task_views.py)
    
    Returns:
        dict: Statistics about task creation (families_checked, tasks_created, tasks_skipped, errors)
    """
    
    # TIME-BASED FEATURE TOGGLE: Check if feature is enabled with scheduled time
    scheduled_time = os.environ.get('MONTHLY_CREATOR_TIME', '').strip()
    if not scheduled_time:
        api_logger.debug('Monthly review task creation feature is disabled (MONTHLY_CREATOR_TIME not set or empty)')
        return {
            'status': 'disabled',
            'families_checked': 0,
            'tasks_created': 0,
            'tasks_skipped': 0,
            'errors': 0
        }
    
    try:
        today = timezone.now().date()
        one_month_ago = today - timedelta(days=30)
        
        # Get all children (no is_active field on Children model)
        all_children = Children.objects.all()
        total_families = all_children.count()
        
        if total_families == 0:
            api_logger.info('ℹ️ No active families found for review task creation')
            return {
                'status': 'completed',
                'families_checked': 0,
                'tasks_created': 0,
                'tasks_skipped': 0,
                'errors': 0
            }
        
        # Get or create task type
        task_type, _ = Task_Types.objects.get_or_create(
            task_type='שיחת ביקורת',
            defaults={
                'resource': 'childsmile_app_children',
                'action': 'CREATE'
            }
        )
        
        # Get Technical Coordinator role
        try:
            tech_coordinator_role = Role.objects.get(role_name='Technical Coordinator')
            coordinators = Staff.objects.filter(
                roles=tech_coordinator_role,
                is_active=True
            )
        except Role.DoesNotExist:
            api_logger.error('❌ Role "Technical Coordinator" not found')
            return {
                'status': 'error',
                'families_checked': total_families,
                'tasks_created': 0,
                'tasks_skipped': 0,
                'errors': 1
            }
        
        if not coordinators.exists():
            api_logger.warning('⚠️ No active technical coordinators found')
            return {
                'status': 'error',
                'families_checked': total_families,
                'tasks_created': 0,
                'tasks_skipped': 0,
                'errors': 1
            }
        
        tasks_created = 0
        tasks_skipped = 0
        coordinator_list = list(coordinators)
        
        # Check each family
        for child in all_children:
            # Check if month has passed since last talk (or never had one)
            if child.last_review_talk_conducted is None or child.last_review_talk_conducted <= one_month_ago:
                
                # Create ONE task per coordinator for this child
                child_full_name = f"{child.childfirstname} {child.childsurname}".strip()
                last_talk_date = child.last_review_talk_conducted.strftime('%d/%m/%Y') if child.last_review_talk_conducted else 'Never'
                
                # Due date: 30 days from now (gives time to conduct the call)
                due_date = today + timedelta(days=30)
                
                # Task description includes child name and last talk date
                description = f'Monthly family review talk for {child_full_name} - Last talk: {last_talk_date} - Conduct check-up call with family'
                
                # Create one task per coordinator
                for coordinator in coordinator_list:
                    # Check if task already exists for THIS child AND this coordinator
                    # This prevents duplicate tasks per child per coordinator
                    # Only check for INCOMPLETE tasks (לא הושלמה or בביצוע) - completed ones (הושלמה) are done
                    existing_task = Tasks.objects.filter(
                        related_child=child,
                        task_type=task_type,
                        assigned_to=coordinator,
                        status__in=['לא הושלמה', 'בביצוע']  # Only incomplete tasks
                    ).exists()
                    
                    if not existing_task:
                        task = Tasks.objects.create(
                            task_type=task_type,
                            description=description,
                            due_date=due_date,
                            status='לא הושלמה',  # Hebrew: "Not Completed"
                            assigned_to=coordinator,
                            related_child=child
                        )
                        
                        tasks_created += 1
                        api_logger.debug(f"Created review task for family: {child_full_name} (child_id: {child.child_id}) assigned to {coordinator.username}")
                    else:
                        tasks_skipped += 1
            else:
                tasks_skipped += 1
        
        # Log summary
        log_message = f'✅ Monthly review task check completed | Families checked: {total_families} | Created: {tasks_created} | Skipped: {tasks_skipped} | Coordinators: {coordinators.count()}'
        api_logger.info(log_message)
        
        return {
            'status': 'completed',
            'families_checked': total_families,
            'tasks_created': tasks_created,
            'tasks_skipped': tasks_skipped,
            'errors': 0
        }
        
    except Exception as e:
        error_msg = f'❌ Error in monthly review task creation: {str(e)}'
        api_logger.error(error_msg)
        return {
            'status': 'error',
            'families_checked': 0,
            'tasks_created': 0,
            'tasks_skipped': 0,
            'errors': 1,
            'error_message': str(e)
        }


