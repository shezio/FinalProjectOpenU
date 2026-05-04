import json
from django.http import JsonResponse
from rest_framework.decorators import api_view
from django.utils import timezone
from django.db.models import Q
import os

from .models import Staff, CoordinatorProgressReport, WeeklyCoordinatorRequest
from .audit_utils import is_admin
from .logger import api_logger
from .weekly_coordinator_reports import (
    send_weekly_coordinator_request,
    get_iso_week_start,
)
from .utils import conditional_csrf


def _get_staff(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return Staff.objects.get(staff_id=user_id)
    except Staff.DoesNotExist:
        return None


def _report_to_dict(report):
    """Convert CoordinatorProgressReport to dict."""
    return {
        "id": report.id,
        "coordinator_id": report.coordinator.staff_id,
        "coordinator_name": f"{report.coordinator.first_name} {report.coordinator.last_name}",
        "week_starting": str(report.week_starting),
        "message_text": report.message_text,
        "received_at": report.received_at.isoformat() if report.received_at else None,
        "is_reviewed": report.is_reviewed,
        "admin_notes": report.admin_notes or "",
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }


@conditional_csrf
@api_view(["GET"])
def coordinator_reports_list(request):
    """
    GET: List all progress reports (with optional filters)
    Query params:
      - week_starting: ISO date string (YYYY-MM-DD) — filter to specific week
      - coordinator_id: filter to specific coordinator
      - is_reviewed: true/false — filter by review status
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    # Start with all reports, ordered by newest first
    reports = CoordinatorProgressReport.objects.all().order_by("-week_starting", "coordinator")

    # Apply filters
    week_starting = request.GET.get("week_starting")
    if week_starting:
        reports = reports.filter(week_starting=week_starting)

    coordinator_id = request.GET.get("coordinator_id")
    if coordinator_id:
        reports = reports.filter(coordinator__staff_id=coordinator_id)

    is_reviewed = request.GET.get("is_reviewed")
    if is_reviewed is not None:
        is_reviewed_bool = is_reviewed.lower() in ("true", "1", "yes")
        reports = reports.filter(is_reviewed=is_reviewed_bool)

    # Get current week's requests (for status)
    current_week = get_iso_week_start()
    current_week_requests = WeeklyCoordinatorRequest.objects.filter(
        week_starting=current_week
    )

    return JsonResponse({
        "reports": [_report_to_dict(r) for r in reports],
        "total_count": reports.count(),
        "current_week": str(current_week),
        "current_week_requests": {
            "total_sent": current_week_requests.count(),
            "responses_received": current_week_requests.filter(response_received=True).count(),
            "pending": current_week_requests.filter(response_received=False).count(),
        },
    })


@conditional_csrf
@api_view(["GET", "PUT"])
def coordinator_report_detail(request, report_id):
    """
    GET: Get single report
    PUT: Mark as reviewed, add admin notes
    """
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    try:
        report = CoordinatorProgressReport.objects.get(id=report_id)
    except CoordinatorProgressReport.DoesNotExist:
        return JsonResponse({"error": "Report not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"report": _report_to_dict(report)})

    if request.method == "PUT":
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        # Update fields
        if "is_reviewed" in data:
            report.is_reviewed = data["is_reviewed"]
        if "admin_notes" in data:
            report.admin_notes = data["admin_notes"]

        report.save()
        api_logger.info(
            f"[COORDINATOR_REPORTS] Admin {staff.username} updated report {report_id} "
            f"(reviewed={report.is_reviewed})"
        )

        return JsonResponse({"report": _report_to_dict(report)})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@conditional_csrf
@api_view(["POST"])
def send_weekly_request_now(request):
    """POST: Manually trigger weekly coordinator request (for testing/manual trigger)"""
    # Check if feature is enabled
    if not os.getenv('WEEKLY_COORDINATOR_REPORTS_ENABLED', 'true').lower() in ('true', '1', 'yes'):
        return JsonResponse({
            "error": "Feature disabled",
            "message": "Weekly coordinator reports feature is currently disabled (WEEKLY_COORDINATOR_REPORTS_ENABLED=false)"
        }, status=503)
    
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    try:
        send_weekly_coordinator_request()
        return JsonResponse({"success": True, "message": "Weekly requests sent"})
    except Exception as e:
        api_logger.error(f"[COORDINATOR_REPORTS] Error sending weekly requests: {e}")
        return JsonResponse({"error": str(e)}, status=500)
@conditional_csrf
@api_view(["GET"])
def coordinator_reports_summary(request):
    """GET: Summary/stats for the admin dashboard"""
    staff = _get_staff(request)
    if not staff:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    if not is_admin(staff):
        return JsonResponse({"error": "Forbidden (admins only)"}, status=403)

    current_week = get_iso_week_start()

    # Current week stats
    current_requests = WeeklyCoordinatorRequest.objects.filter(week_starting=current_week)
    current_reports = CoordinatorProgressReport.objects.filter(week_starting=current_week)

    # Last week stats
    last_week = current_week - timezone.timedelta(days=7)
    last_week_reports = CoordinatorProgressReport.objects.filter(week_starting=last_week)

    return JsonResponse({
        "current_week": str(current_week),
        "current_week_stats": {
            "requests_sent": current_requests.count(),
            "responses_received": current_reports.count(),
            "pending": current_requests.count() - current_reports.count(),
            "reviewed": current_reports.filter(is_reviewed=True).count(),
            "pending_review": current_reports.filter(is_reviewed=False).count(),
        },
        "last_week_stats": {
            "total_reports": last_week_reports.count(),
            "reviewed": last_week_reports.filter(is_reviewed=True).count(),
        },
        "unreviewed_total": CoordinatorProgressReport.objects.filter(is_reviewed=False).count(),
    })
