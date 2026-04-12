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
    Check all families and create review tasks for those where 90 days have passed since last talk.
    
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
      - Check if last_review_talk_conducted is more than REVIEW_INTERVAL days ago (or null)
      - If yes, create ONE task per Technical Coordinator
      - Prevent duplicates by checking if INCOMPLETE task already exists FOR THAT COORDINATOR
      - If a task was completed (הושלמה), a new one will be created after REVIEW_INTERVAL days
    - Update last_review_talk_conducted when task is completed (in task_views.py)
    
    Returns:
        dict: Statistics about task creation (families_checked, tasks_created, tasks_skipped, errors)
    """
    
    # Define review interval in days
    REVIEW_INTERVAL = 90
    
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
    
    # Prevent double execution: file-based lock
    lock_file = '/tmp/monthly_review_task.lock'
    if os.path.exists(lock_file):
        api_logger.warning('Monthly review task creation skipped: lock file exists (job already running)')
        return {
            'status': 'skipped_due_to_lock',
            'families_checked': 0,
            'tasks_created': 0,
            'tasks_skipped': 0,
            'errors': 0
        }
    try:
        with open(lock_file, 'w') as f:
            f.write(str(datetime.now()))
        
        try:
            today = timezone.now().date()
            review_cutoff_date = today - timedelta(days=REVIEW_INTERVAL)
            
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
            
            # Get Families Coordinator and Tutored Families Coordinator roles
            try:
                families_coordinator_role = Role.objects.get(role_name='Families Coordinator')
            except Role.DoesNotExist:
                api_logger.error('❌ Role "Families Coordinator" not found')
                return {
                    'status': 'error',
                    'families_checked': total_families,
                    'tasks_created': 0,
                    'tasks_skipped': 0,
                    'errors': 1
                }
            try:
                tutored_families_coordinator_role = Role.objects.get(role_name='Tutored Families Coordinator')
            except Role.DoesNotExist:
                api_logger.error('❌ Role "Tutored Families Coordinator" not found')
                return {
                    'status': 'error',
                    'families_checked': total_families,
                    'tasks_created': 0,
                    'tasks_skipped': 0,
                    'errors': 1
                }
            
            tasks_created = 0
            tasks_skipped = 0
            
            # Check each family
            for child in all_children:
                # Feature #3: Check if child is mature (age >= 16) - auto-set need_review=False
                from .utils import check_and_handle_age_maturity
                maturity_result = check_and_handle_age_maturity(child)
                
                # SKIP children marked as not needing review (Feature #2)
                # This includes: בריא/ז״ל/עזב status, בוגר tutoring status, or age >= 16
                if not child.need_review:
                    tasks_skipped += 1
                    reason = ""
                    if maturity_result['mature']:
                        reason = f"(age: {maturity_result['age']})"
                    api_logger.debug(f"Skipping review task for {child.childfirstname} {child.childsurname} (need_review=False) {reason}")
                    continue
                
                # Check if 90 days have passed since last talk (or never had one)
                if child.last_review_talk_conducted is None or child.last_review_talk_conducted <= review_cutoff_date:
                    
                    # Assign to responsible coordinator only if they have the correct role
                    responsible_coordinator_id = getattr(child, 'responsible_coordinator', None)
                    if not responsible_coordinator_id:
                        tasks_skipped += 1
                        api_logger.warning(f"No responsible coordinator for child {child.childfirstname} {child.childsurname} (child_id: {child.child_id})")
                        continue
                    try:
                        responsible_coordinator = Staff.objects.get(staff_id=responsible_coordinator_id)
                    except Staff.DoesNotExist:
                        tasks_skipped += 1
                        api_logger.warning(f"Responsible coordinator with ID {responsible_coordinator_id} not found for child {child.childfirstname} {child.childsurname} (child_id: {child.child_id})")
                        continue
                    # Check if responsible coordinator has one of the required roles
                    if not (responsible_coordinator.roles.filter(role_name='Families Coordinator').exists() or responsible_coordinator.roles.filter(role_name='Tutored Families Coordinator').exists()):
                        tasks_skipped += 1
                        api_logger.warning(f"Responsible coordinator for child {child.childfirstname} {child.childsurname} does not have required role.")
                        continue
                    
                    # Due date: 90 days from now (gives time to conduct the call)
                    due_date = today + timedelta(days=REVIEW_INTERVAL)
                    
                    # Prepare child name and last talk date for description
                    child_full_name = f"{child.childfirstname} {child.childsurname}".strip()
                    last_talk_date = child.last_review_talk_conducted.strftime('%d/%m/%Y') if child.last_review_talk_conducted else 'Never'
                    # Task description includes child name and last talk date
                    description = f'Timely family review talk for {child_full_name} - Last talk: {last_talk_date} - Conduct check-up call with family'
                    
                    # Check if task already exists for THIS child AND this coordinator (by task type name)
                    existing_task = Tasks.objects.filter(
                        related_child=child,
                        task_type__task_type='שיחת ביקורת',
                        assigned_to=responsible_coordinator,
                        status__in=['לא הושלמה', 'בביצוע']  # Only incomplete tasks
                    ).exists()
                    
                    if not existing_task:
                        task = Tasks.objects.create(
                            task_type=task_type,
                            description=description,
                            due_date=due_date,
                            status='לא הושלמה',  # Hebrew: "Not Completed"
                            assigned_to=responsible_coordinator,
                            related_child=child
                        )
                        
                        tasks_created += 1
                        api_logger.debug(f"Created review task for family: {child_full_name} (child_id: {child.child_id}) assigned to {responsible_coordinator.username}")
                    else:
                        tasks_skipped += 1
                else:
                    tasks_skipped += 1
            
            # Log summary
            log_message = f'✅ Timely review task check completed | Families checked: {total_families} | Created: {tasks_created} | Skipped: {tasks_skipped}'
            api_logger.info(log_message)
            
            return {
                'status': 'completed',
                'families_checked': total_families,
                'tasks_created': tasks_created,
                'tasks_skipped': tasks_skipped,
                'errors': 0
            }
            
        except Exception as e:
            error_msg = f'❌ Error in timely review task creation: {str(e)}'
            api_logger.error(error_msg)
            return {
                'status': 'error',
                'families_checked': 0,
                'tasks_created': 0,
                'tasks_skipped': 0,
                'errors': 1,
                'error_message': str(e)
            }
        finally:
            if os.path.exists(lock_file):
                os.remove(lock_file)
    except Exception as e:
        api_logger.error(f"Error handling lock file: {str(e)}")
        return {
            'status': 'error',
            'families_checked': 0,
            'tasks_created': 0,
            'tasks_skipped': 0,
            'errors': 1,
            'error_message': str(e)
        }


def refresh_all_ages_monthly():
    """
    Monthly age refresh for all volunteers, tutors, and children.
    This should be called once a month to ensure ages are up-to-date.
    
    AUTOMATIC SCHEDULING: Runs automatically on the 1st of each month at 4:00 AM Israel time.
    - Set AGE_REFRESH_ENABLED='true' to enable monthly age refresh
    - If not set or 'false', feature is completely disabled
    
    Logic:
    - Refresh ages for all SignedUp records (volunteers & tutors) from birth_date
    - Refresh ages in PossibleMatches table for children
    
    Returns:
        dict: Statistics about age refresh (volunteers_updated, children_updated, errors)
    """
    from .utils import refresh_volunteer_ages, refresh_children_ages
    
    # Check if feature is enabled
    age_refresh_enabled = os.environ.get('AGE_REFRESH_ENABLED', 'false').lower() == 'true'
    if not age_refresh_enabled:
        api_logger.debug('Monthly age refresh feature is disabled (AGE_REFRESH_ENABLED not set to true)')
        return {
            'status': 'disabled',
            'volunteers_updated': 0,
            'children_updated': 0,
            'errors': 0
        }
    
    try:
        api_logger.info('🔄 Starting monthly age refresh...')
        
        # Refresh volunteer/tutor ages
        volunteer_result = refresh_volunteer_ages()
        
        # Refresh children ages in PossibleMatches
        children_result = refresh_children_ages()
        
        log_message = f'✅ Monthly age refresh completed | Volunteers updated: {volunteer_result["updated"]} | Children updated: {children_result["updated"]}'
        api_logger.info(log_message)
        
        return {
            'status': 'completed',
            'volunteers_updated': volunteer_result['updated'],
            'volunteers_skipped': volunteer_result.get('skipped', 0),
            'children_updated': children_result['updated'],
            'errors': 0
        }
        
    except Exception as e:
        error_msg = f'❌ Error in monthly age refresh: {str(e)}'
        api_logger.error(error_msg)
        return {
            'status': 'error',
            'volunteers_updated': 0,
            'children_updated': 0,
            'errors': 1,
            'error_message': str(e)
        }



