"""
notification_views.py

REST API for the Notification Center.

Table rows: only manual, custom_auto, and the 2 birthday TEMPLATE rows.
Birthday virtual rows are computed live at GET time from the Children table.

Endpoints (all under /api/notifications/):
  GET    /                      — list messages (DB rows + live birthday virtuals)
  GET    /templates/            — list only the DB template rows (management page)
  POST   /create/               — create manual/custom_auto (admin only)
  PUT    /update/<id>/          — update a DB row (admin only)
  DELETE /delete/<id>/          — delete a DB row (admin only)
"""

from django.http import JsonResponse
from rest_framework.decorators import api_view
from .models import NotificationMessage, Staff
from .utils import conditional_csrf, is_admin, block_viewer_writes
from .audit_utils import log_api_action
from .logger import api_logger


# ─── helpers ──────────────────────────────────────────────────────────────────

def _serialize(msg: NotificationMessage) -> dict:
    return {
        "id":           msg.id,
        "message_type": msg.message_type,
        "title":        msg.title,
        "text":         msg.text,
        "child_id":     msg.child_id,
        "child_name":   f"{msg.child.childfirstname} {msg.child.childsurname}" if msg.child else None,
        "is_auto":      msg.is_auto,
        "is_active":    msg.is_active,
        "created_at":   msg.created_at.isoformat() if msg.created_at else None,
        "updated_at":   msg.updated_at.isoformat() if msg.updated_at else None,
        "created_by":   msg.created_by.username if msg.created_by else None,
        "virtual":      False,
    }


def _get_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        return None


# ─── views ────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_notifications(request):
    """
    Bell panel endpoint.
    Returns DB rows (manual/custom_auto + birthday templates) PLUS
    live virtual birthday messages computed from Children.
    """
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    # DB rows (templates + manual + custom_auto)
    db_msgs = list(NotificationMessage.objects.filter(
        is_active=True
    ).select_related("child", "created_by"))

    # Birthday template rows should NOT appear in the bell panel —
    # only the live per-child virtuals do.
    panel_db = [_serialize(m) for m in db_msgs
                if m.message_type not in ('birthday_today', 'birthday_this_week', 'birthday_next_week')]

    # Live birthday rows
    from .notification_utils import get_birthday_virtual_messages
    virtuals = get_birthday_virtual_messages()

    data = virtuals + panel_db   # birthdays first, then manual/custom
    return JsonResponse({"results": data, "count": len(data)})


@conditional_csrf
@api_view(["GET"])
def get_notification_templates(request):
    """
    Management page endpoint.
    Returns only the DB rows (templates + manual + custom_auto).
    No virtual rows.
    """
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    msgs = NotificationMessage.objects.all().select_related("child", "created_by")
    data = [_serialize(m) for m in msgs]
    return JsonResponse({"results": data, "count": len(data)})


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_notification(request):
    """Create a manual or custom_auto notification message. Admin only."""
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    if not is_admin(user):
        return JsonResponse({"error": "רק מנהל מערכת יכול ליצור הודעות."}, status=403)

    data = request.data
    title        = (data.get("title") or "").strip()
    text         = (data.get("text")  or "").strip()
    message_type = data.get("message_type", "manual")

    if not title or not text:
        return JsonResponse({"error": "שדות כותרת ותוכן הן חובה."}, status=400)

    allowed = [NotificationMessage.MessageType.MANUAL, NotificationMessage.MessageType.CUSTOM_AUTO]
    if message_type not in [t.value for t in allowed]:
        return JsonResponse({"error": f"סוג הודעה '{message_type}' אינו מורשה ליצירה ידנית."}, status=400)

    msg = NotificationMessage.objects.create(
        message_type=message_type,
        title=title,
        text=text,
        is_auto=(message_type == NotificationMessage.MessageType.CUSTOM_AUTO),
        is_active=True,
        created_by=user,
    )
    log_api_action(request=request, action='CREATE_NOTIFICATION', success=True, status_code=201)
    api_logger.info(f"✅ Notification created by {user.username}: [{message_type}] {title}")
    return JsonResponse(_serialize(msg), status=201)


@conditional_csrf
@api_view(["PUT", "PATCH"])
@block_viewer_writes
def update_notification(request, notification_id):
    """Update a DB notification row. Admin only."""
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    if not is_admin(user):
        return JsonResponse({"error": "רק מנהל מערכת יכול לערוך הודעות."}, status=403)

    try:
        msg = NotificationMessage.objects.get(pk=notification_id)
    except NotificationMessage.DoesNotExist:
        return JsonResponse({"error": "הודעה לא נמצאה."}, status=404)

    data = request.data
    if "title"     in data: msg.title     = (data["title"] or "").strip()
    if "text"      in data: msg.text      = (data["text"]  or "").strip()
    if "is_active" in data: msg.is_active = bool(data["is_active"])
    msg.save()

    log_api_action(request=request, action='UPDATE_NOTIFICATION', success=True, status_code=200)
    api_logger.info(f"✏️ Notification {notification_id} updated by {user.username}")
    return JsonResponse(_serialize(msg))


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_notification(request, notification_id):
    """Delete a DB notification row. Admin only."""
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    if not is_admin(user):
        return JsonResponse({"error": "רק מנהל מערכת יכול למחוק הודעות."}, status=403)

    try:
        msg = NotificationMessage.objects.get(pk=notification_id)
    except NotificationMessage.DoesNotExist:
        return JsonResponse({"error": "הודעה לא נמצאה."}, status=404)

    msg.delete()
    log_api_action(request=request, action='DELETE_NOTIFICATION', success=True, status_code=200)
    api_logger.info(f"🗑️ Notification {notification_id} deleted by {user.username}")
    return JsonResponse({"message": "הודעה נמחקה בהצלחה."})


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def refresh_birthday_notifications(request):
    """
    Force-run the birthday scheduler job now.
    Admin only. The scheduler also calls the same logic every hour.
    """
    user = _get_user(request)
    if not user:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not is_admin(user):
        return JsonResponse({"error": "רק מנהל מערכת יכול לרענן הודעות יום הולדת."}, status=403)

    try:
        from .scheduler import _run_birthday_notification_refresh
        _run_birthday_notification_refresh()
        # Return fresh template list
        msgs = NotificationMessage.objects.all().select_related("child", "created_by")
        data = [_serialize(m) for m in msgs]
        return JsonResponse({"message": "רענון הושלם.", "results": data, "count": len(data)})
    except Exception as e:
        api_logger.error(f"❌ Error refreshing birthday notifications: {e}")
        return JsonResponse({"error": str(e)}, status=500)
