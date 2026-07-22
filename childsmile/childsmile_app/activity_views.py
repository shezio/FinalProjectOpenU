"""
Fun Days & House Visits Views (ימי כיף וביקורי בית)

Endpoints (coordinator/admin unless noted PUBLIC or VOLUNTEER):
  ── Rounds (מחזורי בקשות) — coordinator/admin ──
  GET    /api/activities/rounds/                     – list rounds
  POST   /api/activities/rounds/create/              – create a round
  PUT    /api/activities/rounds/update/<id>/         – update a round
  DELETE /api/activities/rounds/delete/<id>/         – delete a round (cascades its requests)

  ── Requests board (בקשות פעילות) — coordinator/admin, FULL data ──
  GET    /api/activities/requests/                   – list requests (?round_id= ?activity_type= ?status=)
  POST   /api/activities/requests/create/            – add a request manually
  PUT    /api/activities/requests/update/<id>/       – processing (assign volunteer, status, link child, feedback_received)
  DELETE /api/activities/requests/delete/<id>/       – delete a request

  ── Volunteer self-service (authenticated) ──
  GET    /api/activities/available/                  – DE-IDENTIFIED list of activities to JOIN (excludes ones I'm already on) + teammate names
  GET    /api/activities/mine/                       – the volunteer's own activities (contact details + full teammate list)
  POST   /api/activities/assign-self/<id>/           – volunteer JOINS the team (several per activity, no limit); notifies coordinators
  DELETE /api/activities/leave/<id>/                 – volunteer removes THEMSELVES from the team

  ── PUBLIC (no authentication — same "action of a non-user" precedent as the
     voucher questionnaire / volunteer registration) ──
  GET    /api/activities/public/<round_id>/          – minimal info to render the form (name / is-open)
  POST   /api/activities/public/<round_id>/submit/   – a family submits the questionnaire

Security rules (mirrors voucher_views.py):
  - The board (rounds + requests CRUD) is gated by has_permission on the
    'activityround' / 'activityrequest' resources — granted to System
    Administrator + Volunteer Coordinator (+ Viewer) via add_activity_tables.sql.
  - The volunteer-facing list is DE-IDENTIFIED (city / age / gender / type /
    date only — exactly like the WhatsApp message posted today) and only needs
    an authenticated session; the privacy boundary is the endpoint itself, not a
    table permission — a volunteer NEVER hits the full-data board endpoint.
  - The /public/ endpoints have NO authentication by design. Because they're
    unauthenticated they get the SAME extra hardening the voucher public form
    got: django_ratelimit, a honeypot field ('website'), and explicit
    server-side length/format caps independent of the React form.
"""

import datetime
import re

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit

from .models import (
    Staff, Role, ChildrenLookup,
    ActivityRound, ActivityRequest, ActivityAssignment,
)
from .utils import has_permission, conditional_csrf, block_viewer_writes
from .audit_utils import log_api_action
from .logger import api_logger


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

_ACTIVITY_TYPES = ('fun_day', 'house_visit')
_ACTIVITY_STATUSES = ('open', 'assigned', 'completed', 'cancelled')
_ROUND_STATUSES = ('open', 'closed')

# Field length caps enforced BEFORE hitting the DB — turns an ugly 500 into a
# clean 400, and (for the public form) is independent of the React validation.
_FIELD_MAX_LENGTHS = {
    'child_name': 255, 'child_gender': 20, 'child_age': 10, 'parent_name': 255,
    'parent_phone': 20, 'city': 255, 'treating_hospital': 255,
    'full_address': 255, 'preferred_days': 255, 'assigned_volunteer': 255,
}
_TEXT_FIELDS = ('notes', 'limitations', 'favorite_activities')
_TEXT_FIELD_MAX_LENGTH = 4000

# Israeli phone = 10 digits starting with 0. Tolerantly strips dashes/spaces on
# the server (a direct API call bypasses the digits-only UI) — same "strict UX,
# tolerant API" split as voucher_views.
_ISRAELI_PHONE_RE = re.compile(r'^0\d{9}$')


def _get_authenticated_user(request):
    """Return (staff_obj, None) or (None, error_JsonResponse)."""
    user_id = request.session.get("user_id")
    if not user_id:
        return None, JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )
    try:
        staff = Staff.objects.get(staff_id=user_id)
        return staff, None
    except Staff.DoesNotExist:
        return None, JsonResponse({"detail": "User not found."}, status=403)


def _parse_date(value):
    """'YYYY-MM-DD' -> date, or None for blank. Raises ValueError on garbage."""
    if value in (None, ''):
        return None
    return datetime.datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def _validate_activity_data(data):
    """Return an error message string, or None if clean. Fields are checked
    only-if-present (never enforces required-ness itself — that's each caller's
    job). Used by the public submit AND the admin create/update paths."""
    for field, max_len in _FIELD_MAX_LENGTHS.items():
        val = data.get(field)
        if val and len(str(val)) > max_len:
            return f"{field} ארוך מדי (מקסימום {max_len} תווים)."

    for field in _TEXT_FIELDS:
        val = data.get(field)
        if val and len(str(val)) > _TEXT_FIELD_MAX_LENGTH:
            return f"{field} ארוך מדי (מקסימום {_TEXT_FIELD_MAX_LENGTH} תווים)."

    activity_type = data.get('activity_type')
    if activity_type and activity_type not in _ACTIVITY_TYPES:
        return "סוג פעילות לא תקין."

    requested_date = data.get('requested_date')
    if requested_date not in (None, ''):
        try:
            _parse_date(requested_date)
        except (ValueError, TypeError):
            return "תאריך מבוקש לא תקין."

    phone = data.get('parent_phone')
    if phone and not _ISRAELI_PHONE_RE.match(str(phone).replace('-', '').replace(' ', '')):
        return "מספר טלפון לא תקין (לדוגמה: 0541234567)."

    num_siblings = data.get('num_siblings')
    if num_siblings not in (None, ''):
        try:
            if not (0 <= int(num_siblings) <= 30):
                raise ValueError()
        except (ValueError, TypeError):
            return "מספר אחים לא תקין."

    status = data.get('status')
    if status and status not in _ACTIVITY_STATUSES:
        return "סטטוס לא תקין."

    return None


def _apply_activity_fields(req, data, updated_by):
    """Shared field-assignment for admin create/update AND the public
    questionnaire submission — set whatever keys are present in `data`. May raise
    ValueError (caught by callers -> clean 400)."""
    if 'activity_type' in data:
        at = data['activity_type']
        if at not in _ACTIVITY_TYPES:
            raise ValueError("סוג פעילות לא תקין.")
        req.activity_type = at
    if 'requested_date' in data:
        try:
            req.requested_date = _parse_date(data['requested_date'])
        except (ValueError, TypeError):
            raise ValueError("תאריך מבוקש לא תקין.")

    # Shared detail fields
    if 'child_name' in data:
        req.child_name = data['child_name']
    if 'child_gender' in data:
        req.child_gender = data['child_gender'] or None
    if 'child_age' in data:
        req.child_age = str(data['child_age']) if data['child_age'] not in (None, '') else None
    if 'parent_name' in data:
        req.parent_name = data['parent_name'] or None
    if 'parent_phone' in data:
        req.parent_phone = data['parent_phone'] or None
    if 'city' in data:
        req.city = data['city'] or None
    if 'treating_hospital' in data:
        req.treating_hospital = data['treating_hospital'] or None
    if 'notes' in data:
        req.notes = data['notes'] or None

    # Fun-day-only
    if 'limitations' in data:
        req.limitations = data['limitations'] or None
    if 'favorite_activities' in data:
        req.favorite_activities = data['favorite_activities'] or None

    # House-visit-only
    if 'num_siblings' in data:
        ns = data['num_siblings']
        if ns in (None, ''):
            req.num_siblings = None
        else:
            try:
                req.num_siblings = int(ns)
            except (ValueError, TypeError):
                raise ValueError("מספר אחים לא תקין.")
    if 'full_address' in data:
        req.full_address = data['full_address'] or None
    if 'preferred_days' in data:
        req.preferred_days = data['preferred_days'] or None
    if 'has_safe_room' in data:
        hsr = data['has_safe_room']
        if hsr in (None, ''):
            req.has_safe_room = None
        elif isinstance(hsr, bool):
            req.has_safe_room = hsr
        else:
            req.has_safe_room = str(hsr).strip().lower() in ('true', '1', 'yes', 'כן')

    # Processing / tracking (coordinator only — the public path never sends these)
    if 'assigned_volunteer' in data:
        req.assigned_volunteer = data['assigned_volunteer'] or None
    if 'assigned_volunteer_staff_id' in data:
        req.assigned_volunteer_staff_id = data['assigned_volunteer_staff_id'] or None
    if 'status' in data:
        st = data['status']
        if st and st not in _ACTIVITY_STATUSES:
            raise ValueError("סטטוס לא תקין.")
        req.status = st or 'open'
    if 'linked_child_id' in data:
        req.linked_child_id = data['linked_child_id'] or None
    if 'feedback_received' in data:
        req.feedback_received = bool(data['feedback_received'])

    req.updated_by = updated_by
    return req


# ── Team assignments (many volunteers <-> one activity) ───────────────────────
def _member_name(assignment):
    """Best display name for an assignment row (denormalized name, else live
    Staff name, else username)."""
    if assignment.volunteer_name:
        return assignment.volunteer_name
    s = assignment.staff
    return f"{s.first_name} {s.last_name}".strip() or s.username


def _assignment_members(req):
    """[{staff_id, name}] for every volunteer currently on `req`, join order."""
    return [
        {"staff_id": a.staff_id, "name": _member_name(a)}
        for a in req.assignments.select_related('staff').all()
    ]


def _sync_assigned_denorm(req):
    """Refresh the denormalized ActivityRequest.assigned_volunteer text (comma-
    joined team names) + assigned_volunteer_staff (the primary / first member)
    from the join table. Does NOT touch `status` — each caller owns that (self-
    assign / leave auto-manage it; the coordinator sets it explicitly)."""
    members = list(req.assignments.select_related('staff').all())
    names = [_member_name(m) for m in members]
    req.assigned_volunteer = ", ".join(n for n in names if n) or None
    req.assigned_volunteer_staff = members[0].staff if members else None


def _reconcile_assignments(req, staff_ids, updated_by):
    """Make the join table for `req` exactly match `staff_ids` (coordinator team
    edit): add the missing, delete the absent. Unknown/blank ids are ignored."""
    wanted = []
    for x in (staff_ids or []):
        try:
            wanted.append(int(x))
        except (ValueError, TypeError):
            continue
    wanted = set(wanted)
    existing = {a.staff_id: a for a in req.assignments.all()}

    to_add = wanted - set(existing.keys())
    if to_add:
        staff_map = {s.staff_id: s for s in Staff.objects.filter(staff_id__in=to_add)}
        for sid in to_add:
            s = staff_map.get(sid)
            if not s:
                continue
            ActivityAssignment.objects.create(
                activity_request=req,
                staff=s,
                volunteer_name=f"{s.first_name} {s.last_name}".strip() or s.username,
                updated_by=updated_by,
            )
    for sid, a in existing.items():
        if sid not in wanted:
            a.delete()


def _request_to_dict(r, child_lookup=None):
    """FULL serialization (coordinator board) — includes contact / sensitive fields."""
    linked_child_name = None
    if r.linked_child_id:
        if child_lookup is not None:
            linked_child_name = child_lookup.get(r.linked_child_id)
        else:
            c = ChildrenLookup.objects.filter(child_id=r.linked_child_id).first()
            if c:
                linked_child_name = c.full_name
    return {
        "id": r.activity_request_id,
        "round_id": r.round_id,
        "activity_type": r.activity_type,
        "requested_date": r.requested_date.strftime("%Y-%m-%d") if r.requested_date else None,
        "child_name": r.child_name,
        "child_gender": r.child_gender,
        "child_age": r.child_age,
        "parent_name": r.parent_name,
        "parent_phone": r.parent_phone,
        "city": r.city,
        "treating_hospital": r.treating_hospital,
        "notes": r.notes,
        "limitations": r.limitations,
        "favorite_activities": r.favorite_activities,
        "num_siblings": r.num_siblings,
        "full_address": r.full_address,
        "preferred_days": r.preferred_days,
        "has_safe_room": r.has_safe_room,
        "assigned_volunteer": r.assigned_volunteer,
        "assigned_volunteer_staff_id": r.assigned_volunteer_staff_id,
        "assigned_volunteers": _assignment_members(r),
        "status": r.status,
        "linked_child_id": r.linked_child_id,
        "linked_child_name": linked_child_name,
        "feedback_received": r.feedback_received,
        "submitted_at": r.submitted_at.strftime("%Y-%m-%d %H:%M") if r.submitted_at else None,
        "created_at": r.created_at.strftime("%d/%m/%Y %H:%M") if r.created_at else None,
        "updated_at": r.updated_at.strftime("%d/%m/%Y %H:%M") if r.updated_at else None,
        "updated_by": r.updated_by,
    }


def _request_to_deid_dict(r):
    """DE-IDENTIFIED serialization (volunteer signup list) — ONLY the info a
    volunteer needs to pick an activity: city / age / gender / type / date /
    status. NO name, phone, address, hospital, parent, or notes (exactly like the
    WhatsApp summary posted in the group today, e.g. "רמלה 4 נקבה").

    Teammate names ARE included (assigned_volunteers): those are fellow VOLUNTEERS
    (staff), not family PII — showing them is the whole point of "see who is
    already on it"; the child / family stay de-identified."""
    members = _assignment_members(r)
    return {
        "id": r.activity_request_id,
        "round_id": r.round_id,
        "round_name": r.round.name if r.round_id else None,
        "activity_type": r.activity_type,
        "requested_date": r.requested_date.strftime("%Y-%m-%d") if r.requested_date else None,
        "city": r.city,
        "child_age": r.child_age,
        "child_gender": r.child_gender,
        "status": r.status,
        "assigned_volunteers": members,
        "assigned_count": len(members),
    }


def _round_to_dict(rnd):
    return {
        "id": rnd.activity_round_id,
        "name": rnd.name,
        "status": rnd.status,
        "start_date": rnd.start_date.strftime("%Y-%m-%d") if rnd.start_date else None,
        "end_date": rnd.end_date.strftime("%Y-%m-%d") if rnd.end_date else None,
        "notes": rnd.notes,
        "requests_count": rnd.requests.count(),
        "created_at": rnd.created_at.strftime("%d/%m/%Y %H:%M") if rnd.created_at else None,
        "updated_at": rnd.updated_at.strftime("%d/%m/%Y %H:%M") if rnd.updated_at else None,
        "updated_by": rnd.updated_by,
    }


def _notify_coordinators_of_assignment(activity_request, volunteer_name):
    """Notify every Volunteer Coordinator when a VOLUNTEER self-assigns — a
    WhatsApp via the ACTIVITY_SELF_ASSIGN_SID template. Fully NON-FATAL — never
    breaks the assignment if anything here fails; skips a coordinator only if
    they have no phone / the SID is unset. NOTE: intentionally NOT prod-gated, so
    it also fires on local/dev (lets the self-assign notification be tested
    without deploying)."""
    try:
        from .whatsapp_utils import send_activity_assignment_whatsapp

        coordinator_role = Role.objects.filter(role_name="Volunteer Coordinator").first()
        if not coordinator_role:
            return
        coordinators = Staff.objects.filter(roles=coordinator_role).distinct()
        if not coordinators.exists():
            return

        activity_label = 'יום כיף' if activity_request.activity_type == 'fun_day' else 'ביקור בית'
        where = activity_request.city or 'ללא עיר'
        req_date = activity_request.requested_date.strftime("%d/%m/%Y") if activity_request.requested_date else 'לא צוין'

        for coord in coordinators:
            # WhatsApp — non-fatal per coordinator. NOT prod-gated (fires on
            # local/dev too), so it can be tested without deploying.
            if not coord.staff_phone:
                api_logger.warning(f"Coordinator {coord.staff_id} has no staff_phone — activity WhatsApp skipped")
                continue
            try:
                coord_name = f"{coord.first_name} {coord.last_name}".strip() or coord.username
                send_activity_assignment_whatsapp(
                    coordinator_phone=coord.staff_phone,
                    coordinator_name=coord_name,
                    volunteer_name=volunteer_name,
                    activity_label=activity_label,
                    child_name=activity_request.child_name,
                    city=where,
                    requested_date=req_date,
                )
            except Exception as wa_error:
                api_logger.error(f"Activity self-assign WhatsApp error (non-fatal) for coord {coord.staff_id}: {wa_error}")
    except Exception as e:
        api_logger.error(f"_notify_coordinators_of_assignment error (non-fatal): {e}")


# ══════════════════════════════════════════════════════════════════════════════
# ROUNDS  (coordinator / admin — has_permission on 'activityround')
# ══════════════════════════════════════════════════════════════════════════════

@conditional_csrf
@api_view(["GET"])
def get_activity_rounds(request):
    api_logger.info("get_activity_rounds called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityround", "VIEW"):
        log_api_action(request=request, action='VIEW_ACTIVITY_ROUNDS_FAILED', success=False,
                       error_message="Forbidden", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    rounds = ActivityRound.objects.all()
    data = [_round_to_dict(r) for r in rounds]
    log_api_action(request=request, action='VIEW_ACTIVITY_ROUNDS', success=True, status_code=200,
                   entity_type='ActivityRound', affected_tables=['childsmile_app_activityround'])
    return JsonResponse({"rounds": data}, status=200)


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_activity_round(request):
    api_logger.info("create_activity_round called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityround", "CREATE"):
        log_api_action(request=request, action='CREATE_ACTIVITY_ROUND_FAILED', success=False,
                       error_message="Forbidden", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data
    if not data.get('name'):
        return JsonResponse({"error": "Missing required field: name"}, status=400)

    status = data.get('status') or 'open'
    if status not in _ROUND_STATUSES:
        return JsonResponse({"error": "סטטוס מחזור לא תקין."}, status=400)

    try:
        rnd = ActivityRound(name=data['name'], status=status, notes=data.get('notes') or None,
                            updated_by=staff.username)
        rnd.start_date = _parse_date(data.get('start_date'))
        rnd.end_date = _parse_date(data.get('end_date'))
        rnd.save()
        log_api_action(request=request, action='CREATE_ACTIVITY_ROUND', success=True, status_code=201,
                       entity_type='ActivityRound', entity_ids=[rnd.activity_round_id],
                       affected_tables=['childsmile_app_activityround'])
        return JsonResponse({"message": "המחזור נוצר בהצלחה.", "id": rnd.activity_round_id}, status=201)
    except (ValueError, TypeError):
        return JsonResponse({"error": "תאריך לא תקין."}, status=400)
    except Exception as e:
        api_logger.error(f"create_activity_round error: {e}")
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_activity_round(request, round_id):
    api_logger.info(f"update_activity_round called for round_id={round_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityround", "UPDATE"):
        log_api_action(request=request, action='UPDATE_ACTIVITY_ROUND_FAILED', success=False,
                       error_message="Forbidden", status_code=403, entity_ids=[round_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        rnd = ActivityRound.objects.get(activity_round_id=round_id)
    except ActivityRound.DoesNotExist:
        return JsonResponse({"error": "המחזור לא נמצא."}, status=404)

    data = request.data
    try:
        if 'name' in data:
            if not data['name']:
                return JsonResponse({"error": "שם המחזור נדרש."}, status=400)
            rnd.name = data['name']
        if 'status' in data:
            if data['status'] not in _ROUND_STATUSES:
                return JsonResponse({"error": "סטטוס מחזור לא תקין."}, status=400)
            rnd.status = data['status']
        if 'start_date' in data:
            rnd.start_date = _parse_date(data['start_date'])
        if 'end_date' in data:
            rnd.end_date = _parse_date(data['end_date'])
        if 'notes' in data:
            rnd.notes = data['notes'] or None
        rnd.updated_by = staff.username
        rnd.save()
        log_api_action(request=request, action='UPDATE_ACTIVITY_ROUND', success=True, status_code=200,
                       entity_type='ActivityRound', entity_ids=[round_id],
                       affected_tables=['childsmile_app_activityround'])
        return JsonResponse({"message": "המחזור עודכן בהצלחה."}, status=200)
    except (ValueError, TypeError):
        return JsonResponse({"error": "תאריך לא תקין."}, status=400)
    except Exception as e:
        api_logger.error(f"update_activity_round error: {e}")
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_activity_round(request, round_id):
    api_logger.info(f"delete_activity_round called for round_id={round_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityround", "DELETE"):
        log_api_action(request=request, action='DELETE_ACTIVITY_ROUND_FAILED', success=False,
                       error_message="Forbidden", status_code=403, entity_ids=[round_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        rnd = ActivityRound.objects.get(activity_round_id=round_id)
    except ActivityRound.DoesNotExist:
        return JsonResponse({"error": "המחזור לא נמצא."}, status=404)

    rnd.delete()  # cascades its ActivityRequest rows (FK ON DELETE CASCADE)
    log_api_action(request=request, action='DELETE_ACTIVITY_ROUND', success=True, status_code=200,
                   entity_type='ActivityRound', entity_ids=[round_id],
                   affected_tables=['childsmile_app_activityround', 'childsmile_app_activityrequest'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "המחזור נמחק בהצלחה."}, status=200)


# ══════════════════════════════════════════════════════════════════════════════
# REQUESTS BOARD  (coordinator / admin — has_permission on 'activityrequest')
# ══════════════════════════════════════════════════════════════════════════════

@conditional_csrf
@api_view(["GET"])
def get_activity_requests(request):
    """FULL board data. Optional filters: ?round_id= ?activity_type= ?status=."""
    api_logger.info("get_activity_requests called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityrequest", "VIEW"):
        log_api_action(request=request, action='VIEW_ACTIVITY_REQUESTS_FAILED', success=False,
                       error_message="Forbidden", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = ActivityRequest.objects.prefetch_related('assignments__staff').all()
    if request.GET.get('round_id'):
        qs = qs.filter(round_id=request.GET['round_id'])
    if request.GET.get('activity_type'):
        qs = qs.filter(activity_type=request.GET['activity_type'])
    if request.GET.get('status'):
        qs = qs.filter(status=request.GET['status'])

    # Batch-resolve linked family names via the minimal ChildrenLookup view.
    child_ids = {r.linked_child_id for r in qs if r.linked_child_id}
    child_lookup = {
        c.child_id: c.full_name
        for c in ChildrenLookup.objects.filter(child_id__in=child_ids)
    }
    data = [_request_to_dict(r, child_lookup) for r in qs]
    log_api_action(request=request, action='VIEW_ACTIVITY_REQUESTS', success=True, status_code=200,
                   entity_type='ActivityRequest', affected_tables=['childsmile_app_activityrequest'])
    return JsonResponse({"requests": data}, status=200)


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_activity_request(request):
    """Coordinator manually adds a request (e.g. a phone/WhatsApp intake)."""
    api_logger.info("create_activity_request called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityrequest", "CREATE"):
        log_api_action(request=request, action='CREATE_ACTIVITY_REQUEST_FAILED', success=False,
                       error_message="Forbidden", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data
    for f in ('round_id', 'activity_type', 'child_name'):
        if not data.get(f):
            return JsonResponse({"error": f"Missing required fields: round_id, activity_type, child_name"}, status=400)

    try:
        rnd = ActivityRound.objects.get(activity_round_id=data['round_id'])
    except ActivityRound.DoesNotExist:
        return JsonResponse({"error": "המחזור לא נמצא."}, status=404)

    if data.get('linked_child_id'):
        if not ChildrenLookup.objects.filter(child_id=data['linked_child_id']).exists():
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    validation_error = _validate_activity_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    try:
        req = ActivityRequest(round=rnd)
        _apply_activity_fields(req, data, staff.username)
        req.save()
        log_api_action(request=request, action='CREATE_ACTIVITY_REQUEST', success=True, status_code=201,
                       entity_type='ActivityRequest', entity_ids=[req.activity_request_id],
                       affected_tables=['childsmile_app_activityrequest'])
        return JsonResponse({"message": "הבקשה נוספה בהצלחה.", "id": req.activity_request_id}, status=201)
    except ValueError as e:
        return JsonResponse({"error": str(e) or "נתונים לא תקינים."}, status=400)
    except Exception as e:
        api_logger.error(f"create_activity_request error: {e}")
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_activity_request(request, request_id):
    """Coordinator processing: assign a volunteer, change status, link a child,
    mark feedback_received, correct fields. A coordinator setting the assignment
    here does NOT trigger the self-assign coordinator notification (they're the
    one doing it)."""
    api_logger.info(f"update_activity_request called for request_id={request_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityrequest", "UPDATE"):
        log_api_action(request=request, action='UPDATE_ACTIVITY_REQUEST_FAILED', success=False,
                       error_message="Forbidden", status_code=403, entity_ids=[request_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        req = ActivityRequest.objects.get(activity_request_id=request_id)
    except ActivityRequest.DoesNotExist:
        return JsonResponse({"error": "הבקשה לא נמצאה."}, status=404)

    data = request.data
    if data.get('linked_child_id'):
        if not ChildrenLookup.objects.filter(child_id=data['linked_child_id']).exists():
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    validation_error = _validate_activity_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    try:
        with transaction.atomic():
            _apply_activity_fields(req, data, staff.username)
            # Coordinator team edit: when 'assigned_staff_ids' is sent, the join
            # table becomes the source of truth — reconcile it, then refresh the
            # denormalized name/primary FK. The coordinator's explicit `status`
            # (from _apply_activity_fields) is respected as-is — NOT auto-flipped.
            if 'assigned_staff_ids' in data:
                _reconcile_assignments(req, data.get('assigned_staff_ids'), staff.username)
                _sync_assigned_denorm(req)
            req.save()
        log_api_action(request=request, action='UPDATE_ACTIVITY_REQUEST', success=True, status_code=200,
                       entity_type='ActivityRequest', entity_ids=[request_id],
                       affected_tables=['childsmile_app_activityrequest', 'childsmile_app_activityassignment'])
        return JsonResponse({"message": "הבקשה עודכנה בהצלחה."}, status=200)
    except ValueError as e:
        return JsonResponse({"error": str(e) or "נתונים לא תקינים."}, status=400)
    except Exception as e:
        api_logger.error(f"update_activity_request error: {e}")
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_activity_request(request, request_id):
    api_logger.info(f"delete_activity_request called for request_id={request_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err
    if not has_permission(request, "activityrequest", "DELETE"):
        log_api_action(request=request, action='DELETE_ACTIVITY_REQUEST_FAILED', success=False,
                       error_message="Forbidden", status_code=403, entity_ids=[request_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        req = ActivityRequest.objects.get(activity_request_id=request_id)
    except ActivityRequest.DoesNotExist:
        return JsonResponse({"error": "הבקשה לא נמצאה."}, status=404)

    req.delete()
    log_api_action(request=request, action='DELETE_ACTIVITY_REQUEST', success=True, status_code=200,
                   entity_type='ActivityRequest', entity_ids=[request_id],
                   affected_tables=['childsmile_app_activityrequest'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "הבקשה נמחקה בהצלחה."}, status=200)


# ══════════════════════════════════════════════════════════════════════════════
# VOLUNTEER SELF-SERVICE  (authenticated — DE-IDENTIFIED list + self-assign)
# ══════════════════════════════════════════════════════════════════════════════

@conditional_csrf
@api_view(["GET"])
def get_available_activities(request):
    """DE-IDENTIFIED list of activities (in an OPEN round) that the authenticated
    volunteer can still JOIN — i.e. not completed/cancelled and NOT ones they've
    already joined (those show under "mine"). A team activity that others already
    joined stays here (no capacity limit) with its current teammate names, so the
    volunteer can "see who is already on it" before joining. Returns ONLY
    city/age/gender/type/date + teammate names (fellow volunteers, not family PII)."""
    api_logger.info("get_available_activities called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    qs = ActivityRequest.objects.select_related('round').prefetch_related('assignments__staff').filter(
        status__in=['open', 'assigned'], round__status='open',
    ).exclude(
        assignments__staff_id=staff.staff_id
    ).distinct()
    if request.GET.get('activity_type'):
        qs = qs.filter(activity_type=request.GET['activity_type'])
    data = [_request_to_deid_dict(r) for r in qs]
    return JsonResponse({"activities": data}, status=200)


@conditional_csrf
@api_view(["GET"])
def get_my_activities(request):
    """The authenticated volunteer's OWN activities (any they're on the team of)
    — WITH the contact details they need to run the activity, PLUS the full
    teammate list (assigned_volunteers) so they can coordinate."""
    api_logger.info("get_my_activities called")
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    qs = ActivityRequest.objects.prefetch_related('assignments__staff').filter(assignments__staff_id=staff.staff_id).distinct()
    data = [_request_to_dict(r) for r in qs]
    return JsonResponse({"activities": data}, status=200)


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def assign_self_to_activity(request, request_id):
    """A volunteer self-assigns (JOINS the team of) an activity. Several
    volunteers can be on one activity (no capacity limit); a volunteer can't join
    the same one twice. Adds a join row, refreshes the denormalized team fields,
    flips an 'open' request to 'assigned', and notifies the Volunteer Coordinators
    (task). In-system equivalent of replying "אני לוקח" in the WhatsApp group."""
    api_logger.info(f"assign_self_to_activity called for request_id={request_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        req = ActivityRequest.objects.select_related('round').get(activity_request_id=request_id)
    except ActivityRequest.DoesNotExist:
        return JsonResponse({"error": "הבקשה לא נמצאה."}, status=404)

    if req.round.status != 'open':
        return JsonResponse({"error": "המחזור סגור לשיבוץ."}, status=400)
    if req.status in ('completed', 'cancelled'):
        return JsonResponse({"error": "הפעילות כבר הסתיימה או בוטלה."}, status=400)
    if req.assignments.filter(staff_id=staff.staff_id).exists():
        return JsonResponse({"error": "כבר שובצת לפעילות זו."}, status=400)

    volunteer_name = f"{staff.first_name} {staff.last_name}".strip() or staff.username
    with transaction.atomic():
        ActivityAssignment.objects.create(
            activity_request=req, staff=staff,
            volunteer_name=volunteer_name, updated_by=staff.username,
        )
        _sync_assigned_denorm(req)
        if req.status == 'open':
            req.status = 'assigned'
        req.updated_by = staff.username
        req.save()

    # In-system notification to coordinators — non-fatal (never breaks the assign).
    _notify_coordinators_of_assignment(req, volunteer_name)

    log_api_action(request=request, action='ASSIGN_SELF_TO_ACTIVITY', success=True, status_code=200,
                   entity_type='ActivityRequest', entity_ids=[request_id],
                   affected_tables=['childsmile_app_activityrequest', 'childsmile_app_activityassignment'],
                   additional_data={"volunteer": volunteer_name})
    return JsonResponse({"message": "שובצת בהצלחה! הרכז יצור איתך קשר."}, status=200)


@conditional_csrf
@api_view(["DELETE", "POST"])
@block_viewer_writes
def leave_activity(request, request_id):
    """A volunteer removes THEMSELVES from an activity's team. Deletes their join
    row, refreshes the denormalized team fields, and (if they were the last one)
    flips the request back to 'open'. Only ever affects the caller's own row."""
    api_logger.info(f"leave_activity called for request_id={request_id}")
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    try:
        req = ActivityRequest.objects.get(activity_request_id=request_id)
    except ActivityRequest.DoesNotExist:
        return JsonResponse({"error": "הבקשה לא נמצאה."}, status=404)

    assignment = req.assignments.filter(staff_id=staff.staff_id).first()
    if not assignment:
        return JsonResponse({"error": "אינך משובץ לפעילות זו."}, status=400)

    with transaction.atomic():
        assignment.delete()
        _sync_assigned_denorm(req)
        if req.status == 'assigned' and not req.assignments.exists():
            req.status = 'open'
        req.updated_by = staff.username
        req.save()

    log_api_action(request=request, action='LEAVE_ACTIVITY', success=True, status_code=200,
                   entity_type='ActivityRequest', entity_ids=[request_id],
                   affected_tables=['childsmile_app_activityrequest', 'childsmile_app_activityassignment'])
    return JsonResponse({"message": "בוטל השיבוץ שלך לפעילות."}, status=200)


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC QUESTIONNAIRE  (NO authentication — extra-hardened, see module docstring)
# ══════════════════════════════════════════════════════════════════════════════

@conditional_csrf
@api_view(["GET"])
@ratelimit(key='ip', rate='30/m', method='GET', block=True)
def get_activity_public_info(request, round_id):
    """PUBLIC: minimal info so the questionnaire page can render (name) and show
    a friendly "closed" message. Nothing sensitive is exposed. Rate limited to
    slow down round_id enumeration."""
    try:
        rnd = ActivityRound.objects.get(activity_round_id=round_id)
    except ActivityRound.DoesNotExist:
        return JsonResponse({"error": "המחזור לא נמצא."}, status=404)

    return JsonResponse({
        "id": rnd.activity_round_id,
        "name": rnd.name,
        "status": rnd.status,
        "is_open": rnd.status == 'open',
    }, status=200)


@conditional_csrf
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def submit_activity_request(request, round_id):
    """PUBLIC: a family (no account, no session) submits a fun-day / house-visit
    request into an OPEN round. Creates an ActivityRequest with submitted_at=now()
    and status='open'. Rate limited (5/min/IP, same as the voucher form)."""
    api_logger.info(f"submit_activity_request called for round_id={round_id}")

    try:
        rnd = ActivityRound.objects.get(activity_round_id=round_id)
    except ActivityRound.DoesNotExist:
        return JsonResponse({"error": "המחזור לא נמצא."}, status=404)

    if rnd.status != 'open':
        return JsonResponse({"error": "הרישום למחזור זה סגור כרגע."}, status=400)

    data = request.data

    # Honeypot: a hidden "website" field real users never fill. Respond as if it
    # succeeded so a bot doesn't learn it was caught.
    if data.get('website'):
        api_logger.warning(f"submit_activity_request: honeypot triggered for round {round_id}")
        return JsonResponse({"message": "הבקשה נשלחה בהצלחה. תודה!"}, status=201)

    # Required fields for a usable request. child_gender/child_age/city feed the
    # de-identified volunteer summary ("עיר גיל מין"); parent_phone is needed to
    # reach the family; requested_date drives the round; house visits also need a
    # full address. Mirrors the client validation in ActivityQuestionnaire.js.
    required_fields = ['activity_type', 'requested_date', 'child_name', 'child_gender', 'child_age', 'city', 'parent_phone']
    if data.get('activity_type') == 'house_visit':
        required_fields.append('full_address')
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

    validation_error = _validate_activity_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    # The public path may only set family-submitted fields — NEVER processing
    # fields (status/assignment/linked_child/feedback). Strip them defensively so
    # a crafted POST can't self-assign or mark itself complete.
    public_data = {k: v for k, v in data.items() if k not in (
        'status', 'assigned_volunteer', 'assigned_volunteer_staff_id',
        'linked_child_id', 'feedback_received',
    )}

    try:
        with transaction.atomic():
            req = ActivityRequest(round=rnd, submitted_at=timezone.now(), status='open')
            _apply_activity_fields(req, public_data, updated_by=None)
            req.save()
        log_api_action(request=request, action='SUBMIT_ACTIVITY_REQUEST', success=True, status_code=201,
                       entity_type='ActivityRequest', entity_ids=[req.activity_request_id],
                       affected_tables=['childsmile_app_activityrequest'])
        return JsonResponse({"message": "הבקשה נשלחה בהצלחה. תודה!"}, status=201)
    except ValueError as e:
        return JsonResponse({"error": str(e) or "נתונים לא תקינים."}, status=400)
    except Exception as e:
        api_logger.error(f"submit_activity_request error: {e}")
        log_api_action(request=request, action='SUBMIT_ACTIVITY_REQUEST_FAILED', success=False,
                       error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)
