"""
meeting_views.py - CRUD API for StaffMeeting (admin-only)
Endpoints:
  GET    /api/meetings/              - list all meetings
  GET    /api/meetings/recipients/   - list all potential invitees (coordinators + admins)
  POST   /api/meetings/              - create meeting
  PUT    /api/meetings/<id>/         - update meeting
  DELETE /api/meetings/<id>/         - cancel meeting (soft)
  POST   /api/meetings/<id>/send-reminders/ - manual trigger reminders
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from .models import Staff, StaffMeeting
from .audit_utils import is_admin
from .meeting_notifications import (
    send_meeting_reminder,
    notify_meeting_created,
    notify_meeting_updated,
    notify_meeting_cancelled,
)
from .logger import api_logger


def _get_staff(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        return None


def _meeting_to_dict(m):
    return {
        "id": m.id,
        "title": m.title,
        "meeting_date": str(m.meeting_date),
        "meeting_time": str(m.meeting_time)[:5],  # HH:MM
        "location": m.location,
        "notes": m.notes,
        "is_cancelled": m.is_cancelled,
        "created_by": m.created_by_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        "reminder_week_sent_at": m.reminder_week_sent_at.isoformat() if m.reminder_week_sent_at else None,
        "reminder_two_days_sent_at": m.reminder_two_days_sent_at.isoformat() if m.reminder_two_days_sent_at else None,
        "reminder_same_day_sent_at": m.reminder_same_day_sent_at.isoformat() if m.reminder_same_day_sent_at else None,
        "invited_staff_ids": m.invited_staff_ids or [],
        "send_whatsapp": m.send_whatsapp,
    }


def _get_all_recipients():
    """Return all active coordinators + admins as list of dicts."""
    from .models import Staff
    from django.db.models import Q
    qs = Staff.objects.filter(
        is_active=True,
        registration_approved=True,
    ).filter(
        Q(roles__role_name__icontains='coordinator') | Q(roles__role_name__icontains='admin')
    ).distinct()
    return [
        {
            "id": s.staff_id,
            "name": f"{s.first_name} {s.last_name}".strip(),
            "email": s.email or "",
            "phone": s.staff_phone or "",
            "is_coordinator": True,
        }
        for s in qs
    ]


def _get_other_staff():
    """Return all active approved staff who are NOT coordinators or admins."""
    from .models import Staff
    from django.db.models import Q
    coordinator_ids = Staff.objects.filter(
        is_active=True,
        registration_approved=True,
    ).filter(
        Q(roles__role_name__icontains='coordinator') | Q(roles__role_name__icontains='admin')
    ).values_list('staff_id', flat=True).distinct()

    qs = Staff.objects.filter(
        is_active=True,
        registration_approved=True,
    ).exclude(staff_id__in=coordinator_ids).distinct()

    return [
        {
            "id": s.staff_id,
            "name": f"{s.first_name} {s.last_name}".strip(),
            "email": s.email or "",
            "phone": s.staff_phone or "",
            "is_coordinator": False,
        }
        for s in qs
    ]


@csrf_exempt
def meetings_list(request):
    """GET: list all meetings | POST: create meeting"""
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "GET":
        meetings = StaffMeeting.objects.all().order_by("meeting_date", "meeting_time")
        return JsonResponse({"meetings": [_meeting_to_dict(m) for m in meetings]})

    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        meeting_date = data.get("meeting_date")
        meeting_time = data.get("meeting_time")
        if not meeting_date or not meeting_time:
            return JsonResponse({"error": "meeting_date and meeting_time are required"}, status=400)

        meeting = StaffMeeting.objects.create(
            title=data.get("title", "פגישת צוות"),
            meeting_date=meeting_date,
            meeting_time=meeting_time,
            location=data.get("location"),
            notes=data.get("notes"),
            created_by=staff,
            invited_staff_ids=data.get("invited_staff_ids", []),
            send_whatsapp=data.get("send_whatsapp", True),
        )
        api_logger.info(f"[MEETINGS] Created meeting {meeting.id} by {staff.username}")
        
        # Send instant notification to invitees
        try:
            notify_meeting_created(meeting)
        except Exception as e:
            api_logger.error(f"[MEETINGS] Error sending notify_meeting_created for {meeting.id}: {e}")
        
        return JsonResponse({"meeting": _meeting_to_dict(meeting)}, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def meeting_recipients(request):
    """GET: return all potential meeting invitees split into coordinators/admins and other staff"""
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden"}, status=403)
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    coordinators = _get_all_recipients()
    others = _get_other_staff()
    return JsonResponse({
        "recipients": coordinators + others,   # flat list for backwards compat
        "coordinators": coordinators,
        "other_staff": others,
    })


@csrf_exempt
def meeting_detail(request, meeting_id):
    """PUT: update meeting | DELETE: cancel (soft-delete)"""
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden"}, status=403)

    try:
        meeting = StaffMeeting.objects.get(id=meeting_id)
    except StaffMeeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

    if request.method == "PUT":
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        # Check if this is a cancellation (is_cancelled changing to True)
        was_cancelled = meeting.is_cancelled
        is_being_cancelled = data.get("is_cancelled") is True

        for field in ("title", "meeting_date", "meeting_time", "location", "notes", "is_cancelled",
                      "invited_staff_ids", "send_whatsapp"):
            if field in data:
                setattr(meeting, field, data[field])
        meeting.save()
        api_logger.info(f"[MEETINGS] Updated meeting {meeting.id} by {staff.username}")
        
        # Send appropriate notification
        try:
            if is_being_cancelled and not was_cancelled:
                # Meeting is being cancelled — send cancellation notification
                api_logger.info(f"[MEETINGS] Detected cancellation: was_cancelled={was_cancelled}, is_being_cancelled={is_being_cancelled}")
                notify_meeting_cancelled(meeting)
            elif not is_being_cancelled:
                # Regular update — send update notification (only if not cancelling)
                api_logger.info(f"[MEETINGS] Detected regular update, sending update notification")
                notify_meeting_updated(meeting)
        except Exception as e:
            api_logger.error(f"[MEETINGS] Error sending notification for {meeting.id}: {e}")
        
        return JsonResponse({"meeting": _meeting_to_dict(meeting)})

    if request.method == "DELETE":
        # Only allow permanent deletion of cancelled meetings
        if not meeting.is_cancelled:
            api_logger.warning(f"[MEETINGS] Attempted hard-delete of active meeting {meeting.id} by {staff.username} - blocked")
            return JsonResponse({"error": "Only cancelled meetings can be permanently deleted"}, status=400)
        
        meeting.delete()
        api_logger.info(f"[MEETINGS] Hard-deleted meeting {meeting.id} by {staff.username}")
        return JsonResponse({"message": "Meeting permanently deleted", "id": meeting.id})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def meeting_hard_delete(request, meeting_id):
    """DELETE: permanently delete a cancelled meeting"""
    if request.method != "DELETE":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden"}, status=403)

    try:
        meeting = StaffMeeting.objects.get(id=meeting_id)
    except StaffMeeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

    if not meeting.is_cancelled:
        return JsonResponse({"error": "Only cancelled meetings can be permanently deleted"}, status=400)

    meeting.delete()
    api_logger.info(f"[MEETINGS] Hard-deleted meeting {meeting_id} by {staff.username}")
    return JsonResponse({"message": "Meeting permanently deleted", "id": meeting_id})


@csrf_exempt
def send_reminders_now(request, meeting_id):
    """POST: manually send all due reminders for a meeting"""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden"}, status=403)

    try:
        meeting = StaffMeeting.objects.get(id=meeting_id)
    except StaffMeeting.DoesNotExist:
        return JsonResponse({"error": "Meeting not found"}, status=404)

    if meeting.is_cancelled:
        return JsonResponse({"error": "Cannot send reminders for a cancelled meeting"}, status=400)

    import datetime
    today = datetime.date.today()
    days_ahead = (meeting.meeting_date - today).days

    if days_ahead == 0:
        reminder_type = 'same_day'
    elif days_ahead <= 2:
        reminder_type = 'two_days_before'
    else:
        reminder_type = 'week_before'

    try:
        send_meeting_reminder(meeting, reminder_type)
        sent = [reminder_type]
    except Exception as e:
        api_logger.error(f"[MEETINGS] Failed to send {reminder_type} reminder for meeting {meeting_id}: {e}")
        sent = []

    api_logger.info(f"[MEETINGS] Manual reminder ({reminder_type}) sent for meeting {meeting_id} by {staff.username}")
    return JsonResponse({"sent": sent, "meeting": _meeting_to_dict(meeting)})
