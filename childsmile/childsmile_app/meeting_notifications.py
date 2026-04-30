"""
Staff meeting reminder notifications.
Sends email + WhatsApp to all active coordinators and admins.

Reminder schedule per meeting:
  • 7 days before  — "שבוע מראש"
  • 2 days before  — "יומיים לפני"
  • Same day       — "היום!"
"""

from django.core.mail import send_mail
from django.conf import settings
import datetime
from .logger import api_logger
from .whatsapp_utils import send_meeting_reminder_whatsapp


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _get_coordinator_recipients():
    """Return all active coordinators + admins (staff with phone + email)."""
    from .models import Staff
    from django.db.models import Q
    return Staff.objects.filter(
        is_active=True,
        registration_approved=True,
    ).filter(
        Q(roles__role_name__icontains='coordinator') | Q(roles__role_name__icontains='admin')
    ).distinct()


def _format_meeting_date(meeting_date, meeting_time):
    """Return Hebrew-friendly date-time string. Week: Sunday=ראשון … Saturday=שבת."""
    # Python weekday(): Mon=0 … Sun=6 → map to Hebrew Sunday-first display
    days_he = ['שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת', 'ראשון']
    day_name = days_he[meeting_date.weekday()]  # Mon=0→שני … Sun=6→ראשון
    return f"יום {day_name} {meeting_date.strftime('%d/%m/%Y')} בשעה {meeting_time.strftime('%H:%M')}"


# ──────────────────────────────────────────────
# Core send function
# ──────────────────────────────────────────────

def send_meeting_reminder(meeting, reminder_type):
    """
    Send email (+ optionally WhatsApp) reminder for a meeting.
    Uses meeting.invited_staff_ids if set, else falls back to all coordinators+admins.
    Uses meeting.send_whatsapp flag to decide whether to send WhatsApp.

    reminder_type: 'week_before' | 'two_days_before' | 'same_day'
    """
    from .models import StaffMeeting, Staff

    # Resolve recipients
    if meeting.invited_staff_ids:
        recipients = Staff.objects.filter(staff_id__in=meeting.invited_staff_ids, is_active=True)
    else:
        recipients = _get_coordinator_recipients()

    if not recipients.exists():
        api_logger.warning("meeting_reminder: no recipients found")
        return

    date_str = _format_meeting_date(meeting.meeting_date, meeting_time=meeting.meeting_time)
    location = meeting.location or "לא צוין מיקום"
    notes = meeting.notes or ""

    if reminder_type == 'week_before':
        subject = f"📅 תזכורת: פגישת צוות בעוד שבוע – {date_str}"
        header = "פגישת הצוות הקרובה היא בעוד שבוע!"
        urgency = ""
    elif reminder_type == 'two_days_before':
        subject = f"⏰ תזכורת: פגישת צוות בעוד יומיים – {date_str}"
        header = "פגישת הצוות הקרובה היא בעוד יומיים!"
        urgency = "אל תשכחו לסדר את הלו\"ז 📋"
    else:  # same_day
        subject = f"🔔 היום! פגישת צוות – {date_str}"
        header = "היום יש פגישת צוות!"
        urgency = "בהצלחה לכולם 💪"

    body_text = (
        f"{header}\n\n"
        f"📅 תאריך ושעה: {date_str}\n"
        f"📍 מיקום: {location}\n"
        f"{('📝 הערות: ' + notes + chr(10)) if notes else ''}"
        f"\n{urgency}\n\n"
        f"– מערכת ChildSmile"
    )

    body_html = f"""
<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;color:#333">
  <h2 style="color:#5a3d8c">{header}</h2>
  <table style="border-collapse:collapse;width:100%;max-width:500px">
    <tr><td style="padding:8px;font-weight:bold">📅 תאריך ושעה</td><td style="padding:8px">{date_str}</td></tr>
    <tr style="background:#f5f5f5"><td style="padding:8px;font-weight:bold">📍 מיקום</td><td style="padding:8px">{location}</td></tr>
    {'<tr><td style="padding:8px;font-weight:bold">📝 הערות</td><td style="padding:8px">' + notes + '</td></tr>' if notes else ''}
  </table>
  {'<p style="margin-top:20px;color:#764ba2;font-weight:bold">' + urgency + '</p>' if urgency else ''}
  <hr style="margin-top:30px;border:1px solid #eee"/>
  <small style="color:#999">– מערכת ChildSmile</small>
</div>
"""

    sent_email = 0
    failed_email = 0

    # Send email to each invitee
    for staff in recipients:
        if staff.email:
            try:
                send_mail(
                    subject=subject,
                    message=body_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[staff.email],
                    html_message=body_html,
                    fail_silently=False,
                )
                sent_email += 1
            except Exception as e:
                failed_email += 1
                api_logger.error(f"meeting_reminder email failed for {staff.email}: {e}")

    # WhatsApp — only for coordinators/admins (they are Staff with staff_phone).
    # Other staff (non-coordinator) get email only — no WhatsApp.
    wa_sent = 0
    wa_failed = 0
    if getattr(meeting, 'send_whatsapp', True):
        from django.db.models import Q
        coordinator_ids = set(
            Staff.objects.filter(
                is_active=True,
                registration_approved=True,
            ).filter(
                Q(roles__role_name__icontains='coordinator') | Q(roles__role_name__icontains='admin')
            ).values_list('staff_id', flat=True)
        )
        # Only send WhatsApp to coordinators/admins in the recipient list
        wa_recipients = [s for s in recipients if s.staff_id in coordinator_ids]
        phones = [s.staff_phone for s in wa_recipients if s.staff_phone]
        if phones:
            wa_results = send_meeting_reminder_whatsapp(
                phones, reminder_type, meeting.title, date_str, location, urgency
            )
            wa_sent = wa_results.get('successful', 0)
            wa_failed = wa_results.get('failed', 0)
        non_wa_count = len([s for s in recipients if s.staff_id not in coordinator_ids])
        if non_wa_count:
            api_logger.info(f"meeting_reminder: {non_wa_count} non-coordinator staff got email only (no WhatsApp)")
    else:
        api_logger.info(f"meeting_reminder: WhatsApp skipped (disabled for meeting {meeting.id})")

    api_logger.info(
        f"meeting_reminder [{reminder_type}] meeting_id={meeting.id} | "
        f"email sent={sent_email} failed={failed_email} | "
        f"whatsapp sent={wa_sent} failed={wa_failed}"
    )

    # Mark the reminder as sent on the meeting record
    now = datetime.datetime.now()
    if reminder_type == 'week_before':
        StaffMeeting.objects.filter(pk=meeting.pk).update(reminder_week_sent_at=now)
    elif reminder_type == 'two_days_before':
        StaffMeeting.objects.filter(pk=meeting.pk).update(reminder_two_days_sent_at=now)
    elif reminder_type == 'same_day':
        StaffMeeting.objects.filter(pk=meeting.pk).update(reminder_same_day_sent_at=now)


# ──────────────────────────────────────────────
# Scheduler job — called daily by APScheduler
# ──────────────────────────────────────────────

def check_and_send_meeting_reminders():
    """
    Called daily by the scheduler.
    Checks all upcoming meetings and sends reminders that haven't been sent yet.
    """
    from .models import StaffMeeting

    today = datetime.date.today()

    # Fetch all future (or today) meetings that are active
    meetings = StaffMeeting.objects.filter(meeting_date__gte=today, is_cancelled=False)

    for meeting in meetings:
        days_ahead = (meeting.meeting_date - today).days

        if days_ahead == 7 and not meeting.reminder_week_sent_at:
            send_meeting_reminder(meeting, 'week_before')

        if days_ahead == 2 and not meeting.reminder_two_days_sent_at:
            send_meeting_reminder(meeting, 'two_days_before')

        if days_ahead == 0 and not meeting.reminder_same_day_sent_at:
            send_meeting_reminder(meeting, 'same_day')
