"""
Weekly coordinator progress reports.
Sends WhatsApp request to all coordinators every week (configurable day/time).
Receives replies via webhook and stores in DB.
Only admins can view responses.

Scheduling:
  - Time: WEEKLY_COORDINATOR_REQUEST_TIME env var (default "08:00")
  - Day: WEEKLY_COORDINATOR_REQUEST_DAY env var (0=Mon…6=Sun, default 0=Monday)
  - Enabled: WEEKLY_COORDINATOR_REPORTS_ENABLED env var (default true)
"""

from django.utils import timezone
from django.db.models import Q
import datetime
import os
import fcntl
import tempfile
from datetime import datetime as dt
from .logger import api_logger
from .models import Staff, WeeklyCoordinatorRequest, CoordinatorProgressReport, CoordinatorChatMessage
from .whatsapp_utils import send_whatsapp_message

# File-based lock to prevent duplicate sends across processes (Django runserver spawns 2)
_LOCK_FILE = os.path.join(tempfile.gettempdir(), 'childsmile_weekly_coordinator.lock')


def get_iso_week_start(date_obj=None):
    """Return Monday of the current/given ISO week (YYYY-MM-DD format)."""
    if date_obj is None:
        date_obj = datetime.date.today()
    
    # ISO weekday: Mon=1, Sun=7
    weekday = date_obj.isoweekday()
    days_since_monday = weekday - 1
    monday = date_obj - datetime.timedelta(days=days_since_monday)
    return monday


def get_all_coordinators():
    """
    Return all active coordinators with staff_phone for WhatsApp messaging.
    Includes any user with a role that contains "Coordinator" in its name.
    Examples:
    - Families Coordinator
    - Tutored Families Coordinator
    - Volunteer Coordinator
    - Any other role with "Coordinator" in the name
    """
    return Staff.objects.filter(
        is_active=True,
        registration_approved=True,
        staff_phone__isnull=False,  # Must have phone for WhatsApp
        roles__role_name__icontains='Coordinator'  # Any role containing "Coordinator"
    ).distinct()


def send_weekly_coordinator_request():
    """
    Send WhatsApp request to all coordinators asking for weekly progress update.
    Runs on the configured day and time (default Monday 08:00 IL timezone).
    
    Scheduling controlled by env vars:
      - WEEKLY_COORDINATOR_REQUEST_TIME (default "08:00")
      - WEEKLY_COORDINATOR_REQUEST_DAY (0=Mon…6=Sun, default 0=Monday)
    
    Uses TWILIO_WEEKLY_COORDINATOR_REQUEST_SID template if available, otherwise falls back to plain text.
    
    Message: "נא לשלוח עדכון שבועי בקבוצת צוות
    ולציין האם יש פערים/בעיות או כל דבר שצריך לעלות על מנת שדברים יתקדמו"
    
    NOTE: Tracks by (coordinator, request_sent_at_date) not week_starting.
    This allows testing by running multiple times per day without waiting for next week.
    """
    import os
    
    # Acquire file lock to prevent duplicate sends (Django runserver runs 2 processes)
    lock_fd = open(_LOCK_FILE, 'w')
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except (IOError, OSError):
        api_logger.info("[WEEKLY_REPORTS] ⏭️ Another process is already sending, skipping")
        lock_fd.close()
        return
    
    try:
        today = timezone.now().date()
        coordinators = list(get_all_coordinators())
        
        if not coordinators:
            api_logger.warning("[WEEKLY_REPORTS] No coordinators found with phone numbers")
            return
        
        message_text = (
            "נא לשלוח עדכון שבועי בקבוצת צוות\n"
            "ולציין האם יש פערים/בעיות או כל דבר שצריך לעלות על מנת שדברים יתקדמו"
        )
        
        template_sid = os.getenv('TWILIO_WEEKLY_COORDINATOR_REQUEST_SID', '').strip()
        coordinators_to_send = coordinators
        
        sent_count = 0
        failed_count = 0
        now = timezone.now()
        
        coordinator_names = [f"{c.username} ({c.staff_phone})" for c in coordinators_to_send]
        api_logger.info(f"[WEEKLY_REPORTS] 📤 About to send requests to {len(coordinators_to_send)} coordinator(s): {', '.join(coordinator_names)}")
        
        # Create request records in DB for auditing
        try:
            requests_to_create = [
                WeeklyCoordinatorRequest(
                    coordinator=coordinator,
                    week_starting=get_iso_week_start(today),
                    request_sent_at=now,
                    response_received=False
                )
                for coordinator in coordinators_to_send
            ]
            WeeklyCoordinatorRequest.objects.bulk_create(requests_to_create, ignore_conflicts=True)
            api_logger.debug(f"[WEEKLY_REPORTS] Created {len(requests_to_create)} request records in DB")
        except Exception as e:
            api_logger.error(f"[WEEKLY_REPORTS] Error creating request records: {e}")
            return
        
        # Send WhatsApp messages one by one
        for coordinator in coordinators_to_send:
            try:
                if template_sid:
                    coordinator_name = coordinator.first_name if coordinator.first_name else coordinator.username
                    send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body="",
                        use_template=True,
                        template_sid=template_sid,
                        template_variables={"1": coordinator_name}
                    )
                    api_logger.info(f"[WEEKLY_REPORTS] Sent request to {coordinator.username} ({coordinator.staff_phone}) using template {template_sid}")
                else:
                    send_whatsapp_message(
                        recipient_phone=coordinator.staff_phone,
                        message_body=message_text,
                        use_template=False
                    )
                    api_logger.warning(f"[WEEKLY_REPORTS] Sent request to {coordinator.username} ({coordinator.staff_phone}) as plain text (template SID not configured)")
                
                sent_count += 1
                
            except Exception as e:
                failed_count += 1
                api_logger.error(f"[WEEKLY_REPORTS] Failed to send WhatsApp to {coordinator.username}: {e}")
        
        api_logger.info(
            f"[WEEKLY_REPORTS] ✅ Requests sent: {sent_count} successful, {failed_count} failed out of {len(coordinators_to_send)} | Template: {'✅ ' + template_sid if template_sid else '❌ NOT SET (using fallback)'}"
        )
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()


def handle_coordinator_response(phone, message_text, received_at):
    """
    Handle incoming WhatsApp response from coordinator.
    Called by Twilio webhook when coordinator replies.
    
    Args:
        phone: Coordinator's phone number (with + prefix from Twilio, e.g., +972546752187)
        message_text: Their progress update message
        received_at: When message was received (datetime)
    
    Returns:
        dict with success status and coordinator info
    """
    week_start = get_iso_week_start()
    
    # Normalize phone number: convert +972XXXXXXXXX to 0XXXXXXXXX
    # Remove all non-digit characters first
    phone_digits = ''.join(c for c in phone if c.isdigit())
    
    # Convert +972 prefix to 0
    if phone_digits.startswith('972'):
        normalized_phone = '0' + phone_digits[3:]  # Remove '972' and add '0'
    else:
        normalized_phone = phone_digits
    
    api_logger.debug(f"[WEEKLY_REPORTS] Normalized phone: {phone} → {normalized_phone}")
    
    # Find coordinator by phone (search for multiple formats)
    # Try exact match first, then variations with dashes
    coordinator = Staff.objects.filter(
        is_active=True,
        registration_approved=True
    ).filter(
        Q(staff_phone=normalized_phone) |
        Q(staff_phone__iexact=normalized_phone)  # Case-insensitive
    ).first()
    
    if not coordinator:
        # Try to find by removing all dashes from stored phone
        all_coords = Staff.objects.filter(
            is_active=True,
            registration_approved=True,
            staff_phone__isnull=False
        )
        for coord in all_coords:
            stored_digits = ''.join(c for c in coord.staff_phone if c.isdigit())
            if stored_digits == phone_digits:
                coordinator = coord
                api_logger.debug(f"[WEEKLY_REPORTS] Found coordinator by digit matching: {coord.staff_phone}")
                break
    
    if not coordinator:
        api_logger.debug(f"[WEEKLY_REPORTS] Received response from unknown phone: {phone} (normalized: {normalized_phone})")
        return {"success": False, "error": "Coordinator not found"}
    
    # Create or update progress report
    report, created = CoordinatorProgressReport.objects.update_or_create(
        coordinator=coordinator,
        week_starting=week_start,
        defaults={
            "message_text": message_text,
            "received_at": received_at,
            "is_reviewed": False,
        }
    )
    
    # Store message in chat history - coordinator's message should be displayed in their chat thread
    # The message is FROM the coordinator, TO ליאם אביבי (for UI display in coordinator-specific chat)
    try:
        msg = CoordinatorChatMessage.objects.create(
            coordinator=coordinator,  # This is THE coordinator who sent the message
            sender_type='coordinator',
            sender_id=coordinator.staff_id,  # Sent BY the coordinator
            message_text=message_text,
            is_read=False
        )
        api_logger.info(f"[WEEKLY_REPORTS] Stored message in chat history (msg_id={msg.id}) for coordinator {coordinator.staff_id}")
    except Exception as e:
        api_logger.error(f"[WEEKLY_REPORTS] Failed to store message in CoordinatorChatMessage: {e}", exc_info=True)
    
    # Send WhatsApp notification to ליאם אביבי about the coordinator's response
    liam = Staff.objects.filter(first_name="ליאם", last_name="אביבי").first()
    if liam and liam.staff_phone:
        try:
            import os
            from .whatsapp_utils import send_whatsapp_message
            coordinator_name = f"{coordinator.first_name} {coordinator.last_name}"
            
            # Try to use existing admin message template
            template_sid = os.getenv('TWILIO_ADMIN_MESSAGE_SID')
            
            if template_sid:
                # Use template with coordinator name and message
                # Template variables: {{1}} = name, {{2}} = message
                send_whatsapp_message(
                    recipient_phone=liam.staff_phone,
                    message_body="",
                    use_template=True,
                    template_sid=template_sid,
                    template_variables={
                        "1": coordinator_name,
                        "2": message_text
                    }
                )
            else:
                # Fallback to plain text if template not configured
                wa_message = f"הודעה חדשה מ{coordinator_name}:\n\n{message_text}"
                send_whatsapp_message(
                    recipient_phone=liam.staff_phone,
                    message_body=wa_message,
                    use_template=False
                )
            
            api_logger.info(f"[WEEKLY_REPORTS] WhatsApp notification sent to ליאם אביבי about response from {coordinator_name}")
        except Exception as wa_error:
            api_logger.warning(f"[WEEKLY_REPORTS] Failed to send WhatsApp to ליאם אביבי: {wa_error}")
    else:
        if not liam:
            api_logger.warning("[WEEKLY_REPORTS] ליאם אביבי not found in system")
        else:
            api_logger.warning("[WEEKLY_REPORTS] ליאם אביבי has no phone number - WhatsApp notification skipped")
    
    # Mark request as responded
    WeeklyCoordinatorRequest.objects.filter(
        coordinator=coordinator,
        week_starting=week_start
    ).update(response_received=True)
    
    action = "updated" if not created else "created"
    api_logger.info(
        f"[WEEKLY_REPORTS] {action.capitalize()} progress report from {coordinator.username} "
        f"for week {week_start}: {message_text[:50]}..."
    )
    
    return {
        "success": True,
        "coordinator_id": coordinator.staff_id,
        "coordinator_name": f"{coordinator.first_name} {coordinator.last_name}",
        "week_starting": str(week_start),
        "report_id": report.id,
    }
