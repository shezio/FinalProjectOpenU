"""
Background scheduler for monthly family review task creation.

Automatically runs the monthly review task check at 4:00 AM Israel time daily,
but ONLY if MONTHLY_CREATOR_TIME environment variable is set.
"""

import os
import threading
import pytz
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .logger import api_logger

# Global scheduler instance
_scheduler = None
_scheduler_lock = threading.Lock()


def start_scheduler():
    """
    Start the background scheduler for monthly review task creation.
    
    Only starts if MONTHLY_CREATOR_TIME environment variable is set.
    Schedule is based on Israel timezone (Asia/Jerusalem).
    """
    global _scheduler
    
    # Check if feature is enabled
    scheduled_time = os.environ.get('MONTHLY_CREATOR_TIME', '').strip()
    if not scheduled_time:
        api_logger.info('Monthly review task creation scheduler: Feature disabled (MONTHLY_CREATOR_TIME not set)')
        return
    
    # Parse time (format: "HH:MM")
    try:
        hour, minute = map(int, scheduled_time.split(':'))
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            api_logger.error(f'Invalid MONTHLY_CREATOR_TIME: {scheduled_time}. Must be HH:MM (00:00-23:59)')
            return
    except (ValueError, IndexError):
        api_logger.error(f'Invalid MONTHLY_CREATOR_TIME format: {scheduled_time}. Expected HH:MM')
        return
    
    with _scheduler_lock:
        # Prevent multiple scheduler instances
        if _scheduler is not None and _scheduler.running:
            api_logger.debug('Scheduler already running')
            return
        
        try:
            # Create scheduler with Israel timezone
            israel_tz = pytz.timezone('Asia/Jerusalem')
            _scheduler = BackgroundScheduler(timezone=israel_tz)
            
            # Add job: Run daily at specified time (Israel timezone)
            _scheduler.add_job(
                func=_run_monthly_review_check,
                trigger=CronTrigger(hour=hour, minute=minute, timezone=israel_tz),
                id='monthly_review_check',
                name='Monthly Family Review Task Check',
                replace_existing=True,
                misfire_grace_time=300  # 5-minute grace period for missed executions
            )
            
            # Add job: Clean up old completed tasks every Friday at 11 PM (Israel timezone)
            _scheduler.add_job(
                func=_run_cleanup_old_tasks,
                trigger=CronTrigger(day_of_week=4, hour=23, minute=0, timezone=israel_tz),
                id='cleanup_old_tasks',
                name='Cleanup Old Completed Tasks',
                replace_existing=True,
                misfire_grace_time=300  # 5-minute grace period for missed executions
            )
            
            _scheduler.start()
            api_logger.info(f'✅ Scheduler started | Monthly review: {scheduled_time} Israel time | Cleanup: Friday 11 PM Israel time')
            
        except Exception as e:
            api_logger.error(f'❌ Error starting scheduler: {str(e)}')


def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler
    
    with _scheduler_lock:
        if _scheduler is not None and _scheduler.running:
            _scheduler.shutdown()
            _scheduler = None
            api_logger.info('Monthly review task scheduler stopped')


def _run_monthly_review_check():
    """
    Execute the monthly review task check.
    This function is called by the scheduler at the configured time.
    """
    try:
        from .monthly_tasks import check_and_create_monthly_review_tasks
        
        api_logger.info('🔄 Monthly review task check triggered by scheduler')
        result = check_and_create_monthly_review_tasks()
        
        # Log results
        if result.get('status') == 'completed':
            api_logger.info(
                f'✅ Scheduled monthly review check completed | '
                f'Families: {result.get("families_checked")} | '
                f'Tasks created: {result.get("tasks_created")} | '
                f'Skipped: {result.get("tasks_skipped")}'
            )
        else:
            api_logger.warning(
                f'⚠️ Scheduled monthly review check completed with status: {result.get("status")} | '
                f'Errors: {result.get("errors")}'
            )
        
    except Exception as e:
        api_logger.error(f'❌ Error in scheduled monthly review task check: {str(e)}')


def _run_cleanup_old_tasks():
    """
    Execute the cleanup of old completed tasks.
    This function is called by the scheduler weekly on Friday at 11 PM.
    
    SAFETY: Only deletes tasks that:
    - Status = 'הושלמה' (Completed)
    - Updated more than 7 days ago
    - Have NO linked InitialFamilyData (prevents CASCADE deletes)
    """
    try:
        from django.core.management import call_command
        
        api_logger.info('🔄 Cleanup old tasks triggered by scheduler (Friday 11 PM)')
        
        # Run the cleanup command
        call_command('cleanup_old_tasks', '--days=7')
        
        api_logger.info('✅ Successfully cleaned up old completed tasks')
        
    except Exception as e:
        api_logger.error(f'❌ CRITICAL ERROR in scheduled cleanup old tasks: {str(e)}')
