"""
Weekly coordinator progress reports.
Sends WhatsApp request to all coordinators every Monday morning (IL timezone).
Receives replies via webhook and stores in DB.
Only admins can view responses.
"""

from django.utils import timezone
from django.db.models import Q
import datetime
from datetime import datetime as dt
from .logger import api_logger
from .models import Staff, WeeklyCoordinatorRequest, CoordinatorProgressReport, CoordinatorChatMessage
from .whatsapp_utils import send_whatsapp_message


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
    Uses same role names as get_available_coordinators:
    - Families Coordinator
    - Tutored Families Coordinator
    """
    return Staff.objects.filter(
        is_active=True,
        registration_approved=True,
        staff_phone__isnull=False,  # Must have phone for WhatsApp
        roles__role_name__in=['Families Coordinator', 'Tutored Families Coordinator']
    ).distinct()


def send_weekly_coordinator_request():
    """
    Send WhatsApp request to all coordinators asking for weekly progress update.
    Runs every Monday morning at 8:00 AM (IL timezone).
    
    Message: "נא לשלוח עדכון שבועי בקבוצת צוות
    ולציין האם יש פערים/בעיות או כל דבר שצריך לעלות על מנת שדברים יתקדמו"
    """
    week_start = get_iso_week_start()
    coordinators = get_all_coordinators()
    
    if not coordinators.exists():
        api_logger.warning("[WEEKLY_REPORTS] No coordinators found with phone numbers")
        return
    
    message_text = (
        "נא לשלוח עדכון שבועי בקבוצת צוות\n"
        "ולציין האם יש פערים/בעיות או כל דבר שצריך לעלות על מנת שדברים יתקדמו"
    )
    
    sent_count = 0
    failed_count = 0
    
    for coordinator in coordinators:
        try:
            # Check if we already sent a request this week
            existing = WeeklyCoordinatorRequest.objects.filter(
                coordinator=coordinator,
                week_starting=week_start
            ).first()
            
            if existing:
                api_logger.info(f"[WEEKLY_REPORTS] Request already sent to {coordinator.username} for week {week_start}")
                continue
            
            # Send WhatsApp
            send_whatsapp_message(
                phone=coordinator.staff_phone,
                message=message_text,
                urgency="normal"
            )
            
            # Create request record
            now = timezone.now()
            WeeklyCoordinatorRequest.objects.create(
                coordinator=coordinator,
                week_starting=week_start,
                request_sent_at=now,
                response_received=False
            )
            
            sent_count += 1
            api_logger.info(f"[WEEKLY_REPORTS] Sent request to {coordinator.username} ({coordinator.staff_phone})")
            
        except Exception as e:
            failed_count += 1
            api_logger.error(f"[WEEKLY_REPORTS] Failed to send request to {coordinator.username}: {e}")
    
    api_logger.info(
        f"[WEEKLY_REPORTS] Weekly requests sent: {sent_count} successful, {failed_count} failed"
    )


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
    
    # Store message in chat history - coordinator's message goes TO ליאם אביבי
    # Get ליאם אביבי
    liam = Staff.objects.filter(first_name="ליאם", last_name="אביבי").first()
    if liam:
        CoordinatorChatMessage.objects.create(
            coordinator=liam,  # Message is stored for ליאם אביבי (the recipient)
            sender_type='coordinator',
            sender_id=coordinator.staff_id,  # Sent BY the coordinator
            message_text=message_text,
            is_read=False
        )
    else:
        api_logger.warning("[WEEKLY_REPORTS] ליאם אביבי not found in system - message not stored in chat")
    
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
