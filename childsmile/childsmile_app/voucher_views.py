"""
Voucher Distribution Views (חלוקת תלושים)

Endpoints (admin-only unless noted PUBLIC):
  GET    /api/vouchers/distributions/                      – list all distributions
  POST   /api/vouchers/distributions/create/                – create a distribution
  PUT    /api/vouchers/distributions/update/<id>/            – update a distribution
  DELETE /api/vouchers/distributions/delete/<id>/            – delete a distribution (cascades recipients)
  GET    /api/vouchers/recipients/                          – list recipients (optional ?distribution_id=)
  POST   /api/vouchers/recipients/create/                    – add a recipient manually (admin)
  PUT    /api/vouchers/recipients/update/<id>/                – update a recipient (processing fields, linking, corrections)
  DELETE /api/vouchers/recipients/delete/<id>/                – delete a recipient

  PUBLIC (no authentication — same "action of a non-user" precedent as
  volunteer/tutor registration, see views_volunteer.py):
  GET    /api/vouchers/public/<distribution_id>/              – minimal info to render the right questionnaire template
  POST   /api/vouchers/public/<distribution_id>/submit/        – family submits the questionnaire

Security rules:
  - Everything EXCEPT the two /public/ endpoints is ADMIN-ONLY (System
    Administrator / Viewer, see utils.is_admin) — same shape as Petty Cash /
    Ongoing Expenses / Financial Aid.
  - The /public/ endpoints have NO authentication check at all by design —
    they're meant to be filled in by families with no account in the system,
    exactly like the existing volunteer/tutor registration flow.
  - Because they're unauthenticated, the /public/ endpoints get EXTRA hardening
    that authenticated endpoints don't need (an authenticated session is
    already a meaningful barrier the public ones don't have):
      * django_ratelimit (key='ip', block=True) on the POST — same package/
        pattern already used by register_send_totp/register_verify_totp and
        the login views (views_auth.py) — blocks scripted flooding.
    * Explicit server-side length caps + format checks on every field (name/
        phone/ID number/free text) — rejects malformed/oversized input with a
        clean 400 instead of a raw DB error, and independent of whatever the
        React form does client-side (a direct curl/script POST bypasses any
        client-side validation entirely).
      * A honeypot field (`website`) — real users never see or fill it (kept
        visually hidden in the form); a non-empty value silently rejects the
        submission with a generic success-shaped response so scripted bots
        that blindly fill every field don't learn they were detected.
    Explicitly NOT done: CAPTCHA (no such service/dependency exists anywhere
    in this codebase already — not introducing a brand-new external
    dependency for this alone).
"""

import datetime
import re

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit

from .models import Staff, ChildrenLookup, VoucherDistribution, VoucherRecipient
from .utils import is_admin, conditional_csrf, block_viewer_writes
from .audit_utils import log_api_action
from .logger import api_logger


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

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


def _recipient_to_dict(r, child_lookup=None):
    linked_child_name = None
    linked_child_status = None
    if r.linked_child_id:
        if child_lookup is not None:
            linked = child_lookup.get(r.linked_child_id)
            if linked:
                linked_child_name, linked_child_status = linked
        else:
            c = ChildrenLookup.objects.filter(child_id=r.linked_child_id).first()
            if c:
                linked_child_name, linked_child_status = c.full_name, c.status
    return {
        "id": r.recipient_id,
        "distribution_id": r.distribution_id,
        "full_name": r.full_name,
        "parent_id_number": r.parent_id_number,
        "phone": r.phone,
        "child_name": r.child_name,
        "child_treatment_status": r.child_treatment_status,
        "child_id_number": r.child_id_number,
        "num_children_at_home": r.num_children_at_home,
        "city": r.city,
        "street_address": r.street_address,
        "case_description": r.case_description,
        "referral_source": r.referral_source,
        "submitted_at": r.submitted_at.strftime("%d/%m/%Y %H:%M") if r.submitted_at else None,
        "approved_amount": str(r.approved_amount) if r.approved_amount is not None else None,
        "ready": r.ready,
        "assigned_volunteer": r.assigned_volunteer,
        "delivered": r.delivered,
        "notes": r.notes,
        "linked_child_id": r.linked_child_id,
        "linked_child_name": linked_child_name,
        "linked_child_status": linked_child_status,
        "updated_by": r.updated_by,
    }


def _distribution_to_dict(d, recipients=None):
    recipients = recipients if recipients is not None else list(d.recipients.all())
    distributed_amount = sum((r.approved_amount or 0) for r in recipients)
    return {
        "id": d.distribution_id,
        "name": d.name,
        "voucher_type": d.voucher_type,
        "initial_amount": str(d.initial_amount),
        "distributed_amount": str(distributed_amount),
        "remaining_amount": str(d.initial_amount - distributed_amount),
        "start_date": d.start_date.strftime("%Y-%m-%d") if d.start_date else None,
        "end_date": d.end_date.strftime("%Y-%m-%d") if d.end_date else None,
        "is_completed": d.is_completed,
        "questionnaire_type": d.questionnaire_type,
        "notes": d.notes,
        "recipients_count": len(recipients),
        "created_at": d.created_at.strftime("%d/%m/%Y %H:%M"),
        "updated_at": d.updated_at.strftime("%d/%m/%Y %H:%M"),
        "updated_by": d.updated_by,
    }


DISTRIBUTION_VOUCHER_TYPES = ['רמי לוי', 'תו פלוס - קרפור', 'אחר']
DISTRIBUTION_QUESTIONNAIRE_TYPES = ['עמותה', 'כללי', 'ללא']
DELIVERED_CHOICES = ['כן', 'איסוף עצמי', 'לא']


# ──────────────────────────────────────────────────────────────────────────────
# DISTRIBUTIONS  (admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_voucher_distributions(request):
    api_logger.info("get_voucher_distributions called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='VIEW_VOUCHER_DISTRIBUTIONS_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='VIEW_VOUCHER_DISTRIBUTIONS_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = VoucherDistribution.objects.prefetch_related('recipients').all()
    data = [_distribution_to_dict(d) for d in qs]

    log_api_action(request=request, action='VIEW_VOUCHER_DISTRIBUTIONS', success=True,
                   status_code=200, entity_type='VoucherDistribution',
                   affected_tables=['childsmile_app_voucherdistribution'])
    return JsonResponse({"distributions": data}, status=200)


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_voucher_distribution(request):
    api_logger.info("create_voucher_distribution called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='CREATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='CREATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data

    required_fields = ['name', 'voucher_type', 'initial_amount']
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

    if data['voucher_type'] not in DISTRIBUTION_VOUCHER_TYPES:
        return JsonResponse({"error": f"Invalid voucher_type: {data['voucher_type']}"}, status=400)

    questionnaire_type = data.get('questionnaire_type') or 'ללא'
    if questionnaire_type not in DISTRIBUTION_QUESTIONNAIRE_TYPES:
        return JsonResponse({"error": f"Invalid questionnaire_type: {questionnaire_type}"}, status=400)

    try:
        initial_amount = Decimal(str(data['initial_amount']))
        if initial_amount <= 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        return JsonResponse({"error": "initial_amount must be a positive number."}, status=400)

    try:
        distribution = VoucherDistribution.objects.create(
            name=data['name'],
            voucher_type=data['voucher_type'],
            initial_amount=initial_amount,
            start_date=data.get('start_date') or None,
            end_date=data.get('end_date') or None,
            is_completed=bool(data.get('is_completed', False)),
            questionnaire_type=questionnaire_type,
            notes=data.get('notes') or None,
            updated_by=staff.username,
        )

        log_api_action(request=request, action='CREATE_VOUCHER_DISTRIBUTION', success=True,
                       status_code=201, entity_type='VoucherDistribution',
                       entity_ids=[distribution.distribution_id],
                       affected_tables=['childsmile_app_voucherdistribution'])
        return JsonResponse({"message": "החלוקה נוספה בהצלחה.", "id": distribution.distribution_id}, status=201)

    except Exception as e:
        api_logger.error(f"create_voucher_distribution error: {e}")
        log_api_action(request=request, action='CREATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_voucher_distribution(request, distribution_id):
    api_logger.info(f"update_voucher_distribution called for distribution_id={distribution_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='UPDATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[distribution_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='UPDATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Forbidden – admins only",
                       status_code=403, entity_ids=[distribution_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        distribution = VoucherDistribution.objects.get(distribution_id=distribution_id)
    except VoucherDistribution.DoesNotExist:
        return JsonResponse({"error": "החלוקה לא נמצאה."}, status=404)

    data = request.data

    try:
        if 'name' in data:
            distribution.name = data['name']
        if 'voucher_type' in data:
            if data['voucher_type'] not in DISTRIBUTION_VOUCHER_TYPES:
                return JsonResponse({"error": f"Invalid voucher_type: {data['voucher_type']}"}, status=400)
            distribution.voucher_type = data['voucher_type']
        if 'initial_amount' in data:
            try:
                distribution.initial_amount = Decimal(str(data['initial_amount']))
            except (InvalidOperation, ValueError):
                return JsonResponse({"error": "initial_amount לא תקין."}, status=400)
        if 'start_date' in data:
            distribution.start_date = data['start_date'] or None
        if 'end_date' in data:
            distribution.end_date = data['end_date'] or None
        if 'is_completed' in data:
            distribution.is_completed = bool(data['is_completed'])
        if 'questionnaire_type' in data:
            if data['questionnaire_type'] not in DISTRIBUTION_QUESTIONNAIRE_TYPES:
                return JsonResponse({"error": f"Invalid questionnaire_type: {data['questionnaire_type']}"}, status=400)
            distribution.questionnaire_type = data['questionnaire_type']
        if 'notes' in data:
            distribution.notes = data['notes'] or None

        distribution.updated_by = staff.username
        distribution.save()

        log_api_action(request=request, action='UPDATE_VOUCHER_DISTRIBUTION', success=True,
                       status_code=200, entity_type='VoucherDistribution',
                       entity_ids=[distribution_id],
                       affected_tables=['childsmile_app_voucherdistribution'])
        return JsonResponse({"message": "החלוקה עודכנה בהצלחה."}, status=200)

    except Exception as e:
        api_logger.error(f"update_voucher_distribution error: {e}")
        log_api_action(request=request, action='UPDATE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message=str(e), status_code=500,
                       entity_ids=[distribution_id])
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_voucher_distribution(request, distribution_id):
    api_logger.info(f"delete_voucher_distribution called for distribution_id={distribution_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='DELETE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[distribution_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='DELETE_VOUCHER_DISTRIBUTION_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403,
                       entity_ids=[distribution_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        distribution = VoucherDistribution.objects.get(distribution_id=distribution_id)
    except VoucherDistribution.DoesNotExist:
        return JsonResponse({"error": "החלוקה לא נמצאה."}, status=404)

    distribution.delete()  # cascades recipients at the DB level

    log_api_action(request=request, action='DELETE_VOUCHER_DISTRIBUTION', success=True,
                   status_code=200, entity_type='VoucherDistribution', entity_ids=[distribution_id],
                   affected_tables=['childsmile_app_voucherdistribution', 'childsmile_app_voucherrecipient'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "החלוקה נמחקה בהצלחה."}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# RECIPIENTS  (admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_voucher_recipients(request):
    """GET: list recipients. Optional ?distribution_id= filters to one
    distribution; otherwise returns EVERY recipient across all distributions
    (feeds the driver-tracking view, which groups/filters by assigned_volunteer
    across distributions)."""
    api_logger.info("get_voucher_recipients called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='VIEW_VOUCHER_RECIPIENTS_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='VIEW_VOUCHER_RECIPIENTS_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = VoucherRecipient.objects.all()
    distribution_id = request.GET.get('distribution_id')
    if distribution_id:
        qs = qs.filter(distribution_id=distribution_id)

    # Batch-resolve linked family names+status via the minimal ChildrenLookup
    # view (one lightweight query, ONLY id/name/status columns) instead of
    # select_related against the full, sensitive Children table.
    child_ids = {r.linked_child_id for r in qs if r.linked_child_id}
    child_lookup = {
        c.child_id: (c.full_name, c.status)
        for c in ChildrenLookup.objects.filter(child_id__in=child_ids)
    }

    data = [_recipient_to_dict(r, child_lookup) for r in qs]

    log_api_action(request=request, action='VIEW_VOUCHER_RECIPIENTS', success=True,
                   status_code=200, entity_type='VoucherRecipient',
                   affected_tables=['childsmile_app_voucherrecipient'])
    return JsonResponse({"recipients": data}, status=200)


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_voucher_recipient(request):
    """POST: staff manually adds a recipient (e.g. distribution has no public
    questionnaire, questionnaire_type='ללא')."""
    api_logger.info("create_voucher_recipient called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='CREATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='CREATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data

    if not data.get('distribution_id') or not data.get('full_name'):
        return JsonResponse({"error": "Missing required fields: distribution_id, full_name"}, status=400)

    try:
        distribution = VoucherDistribution.objects.get(distribution_id=data['distribution_id'])
    except VoucherDistribution.DoesNotExist:
        return JsonResponse({"error": "החלוקה לא נמצאה."}, status=404)

    linked_child_id = data.get('linked_child_id') or None
    if linked_child_id:
        try:
            ChildrenLookup.objects.get(child_id=linked_child_id)
        except ChildrenLookup.DoesNotExist:
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    validation_error = _validate_recipient_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    try:
        recipient = _apply_recipient_fields(VoucherRecipient(distribution=distribution), data, staff.username)
        recipient.save()

        log_api_action(request=request, action='CREATE_VOUCHER_RECIPIENT', success=True,
                       status_code=201, entity_type='VoucherRecipient',
                       entity_ids=[recipient.recipient_id],
                       affected_tables=['childsmile_app_voucherrecipient'])
        return JsonResponse({"message": "הנתמך נוסף בהצלחה.", "id": recipient.recipient_id}, status=201)

    except (InvalidOperation, ValueError) as e:
        return JsonResponse({"error": str(e) or "סכום לא תקין."}, status=400)
    except Exception as e:
        api_logger.error(f"create_voucher_recipient error: {e}")
        log_api_action(request=request, action='CREATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


def _apply_recipient_fields(recipient, data, updated_by):
    """Shared field-assignment for both admin create/update AND the public
    questionnaire submission — set whatever keys are present in `data`."""
    if 'full_name' in data:
        recipient.full_name = data['full_name']
    if 'parent_id_number' in data:
        recipient.parent_id_number = data['parent_id_number'] or None
    if 'phone' in data:
        recipient.phone = data['phone'] or None
    if 'child_name' in data:
        recipient.child_name = data['child_name'] or None
    if 'child_treatment_status' in data:
        treatment_status = data['child_treatment_status'] or None
        if treatment_status and treatment_status not in _CHILD_TREATMENT_STATUSES:
            raise ValueError("מצב טיפול לא תקין.")
        recipient.child_treatment_status = treatment_status
    if 'child_id_number' in data:
        recipient.child_id_number = data['child_id_number'] or None

        # AUTO-MATCH: child_id on Children IS the real government ת"ז (imported
        # directly from the "תעודת זהות ילד/ה" column - see family_views.py's
        # bulk import, and sqlizeforphones.py), NOT an opaque internal PK. So a
        # family-submitted child_id_number (עמותה questionnaire only) can be
        # looked up DIRECTLY against it. Only auto-link when the caller isn't
        # ALSO explicitly setting linked_child_id themselves in this same
        # request (an admin's manual pick always wins over an auto-match, and
        # we never CLEAR an existing link just because this field was blanked
        # out - only ever SET one when a fresh match is found).
        if recipient.child_id_number and 'linked_child_id' not in data:
            try:
                matched = ChildrenLookup.objects.filter(child_id=int(recipient.child_id_number)).first()
                if matched:
                    recipient.linked_child_id = matched.child_id
            except (ValueError, TypeError):
                pass  # non-numeric - _validate_recipient_data rejects this before we ever get here
    if 'num_children_at_home' in data:
        try:
            recipient.num_children_at_home = int(data['num_children_at_home']) if data['num_children_at_home'] not in (None, '') else None
        except (ValueError, TypeError):
            recipient.num_children_at_home = None
    if 'city' in data:
        recipient.city = data['city'] or None
    if 'street_address' in data:
        recipient.street_address = data['street_address'] or None
    if 'case_description' in data:
        recipient.case_description = data['case_description'] or None
    if 'referral_source' in data:
        recipient.referral_source = data['referral_source'] or None

    if 'approved_amount' in data:
        recipient.approved_amount = Decimal(str(data['approved_amount'])) if data['approved_amount'] not in (None, '') else None
    if 'ready' in data:
        recipient.ready = bool(data['ready'])
    if 'assigned_volunteer' in data:
        recipient.assigned_volunteer = data['assigned_volunteer'] or None
    if 'delivered' in data:
        recipient.delivered = data['delivered'] or None
    if 'notes' in data:
        recipient.notes = data['notes'] or None
    if 'linked_child_id' in data:
        recipient.linked_child_id = data['linked_child_id'] or None

    recipient.updated_by = updated_by
    return recipient


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_voucher_recipient(request, recipient_id):
    api_logger.info(f"update_voucher_recipient called for recipient_id={recipient_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='UPDATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[recipient_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='UPDATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Forbidden – admins only",
                       status_code=403, entity_ids=[recipient_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        recipient = VoucherRecipient.objects.get(recipient_id=recipient_id)
    except VoucherRecipient.DoesNotExist:
        return JsonResponse({"error": "הנתמך לא נמצא."}, status=404)

    data = request.data

    if 'linked_child_id' in data and data['linked_child_id']:
        try:
            ChildrenLookup.objects.get(child_id=data['linked_child_id'])
        except ChildrenLookup.DoesNotExist:
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    validation_error = _validate_recipient_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    try:
        _apply_recipient_fields(recipient, data, staff.username)
        recipient.save()

        log_api_action(request=request, action='UPDATE_VOUCHER_RECIPIENT', success=True,
                       status_code=200, entity_type='VoucherRecipient',
                       entity_ids=[recipient_id],
                       affected_tables=['childsmile_app_voucherrecipient'])
        return JsonResponse({"message": "פרטי הנתמך עודכנו בהצלחה."}, status=200)

    except (InvalidOperation, ValueError) as e:
        return JsonResponse({"error": str(e) or "סכום לא תקין."}, status=400)
    except Exception as e:
        api_logger.error(f"update_voucher_recipient error: {e}")
        log_api_action(request=request, action='UPDATE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message=str(e), status_code=500,
                       entity_ids=[recipient_id])
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_voucher_recipient(request, recipient_id):
    api_logger.info(f"delete_voucher_recipient called for recipient_id={recipient_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='DELETE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[recipient_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='DELETE_VOUCHER_RECIPIENT_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403,
                       entity_ids=[recipient_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        recipient = VoucherRecipient.objects.get(recipient_id=recipient_id)
    except VoucherRecipient.DoesNotExist:
        return JsonResponse({"error": "הנתמך לא נמצא."}, status=404)

    recipient.delete()

    log_api_action(request=request, action='DELETE_VOUCHER_RECIPIENT', success=True,
                   status_code=200, entity_type='VoucherRecipient', entity_ids=[recipient_id],
                   affected_tables=['childsmile_app_voucherrecipient'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "הנתמך נמחק בהצלחה."}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# PUBLIC QUESTIONNAIRE  (NO authentication — same precedent as volunteer/tutor
# registration: an action performed by someone with no account in the system)
#
# Extra hardening below since there's no session to act as a first barrier —
# see the module docstring's "Security rules" section.
# ──────────────────────────────────────────────────────────────────────────────

# Field length caps, enforced BEFORE hitting the DB (columns already have these
# as VARCHAR limits — this just turns an ugly 500 DB error into a clean 400).
_FIELD_MAX_LENGTHS = {
    'full_name': 255, 'parent_id_number': 20, 'phone': 20, 'child_name': 255,
    'child_treatment_status': 50, 'child_id_number': 20, 'city': 255,
    'street_address': 255, 'referral_source': 255,
}
_TEXT_FIELD_MAX_LENGTH = 4000  # case_description / notes (TextField, no DB cap, cap here instead)

_ISRAELI_PHONE_RE = re.compile(r'^0[2-9]\d{7,8}$')
_ID_NUMBER_RE = re.compile(r'^\d{5,9}$')  # basic shape check, done BEFORE the checksum below

# Must match Children.status's real choices exactly (models.py) - a voucher
# recipient's child_treatment_status describes the SAME real-world concept for
# the SAME children, so it has to use the identical vocabulary, never invented
# values (e.g. NOT 'פעיל'/'באחזקה'/'סיים', which don't exist anywhere else in the system).
_CHILD_TREATMENT_STATUSES = ['טיפולים', 'מעקבים', 'אחזקה', 'ז״ל', 'בריא', 'עזב']


def _is_valid_israeli_id(id_number):
    """Real Israeli ת"ז checksum (standard Luhn-style algorithm), NOT just a
    digit-count check. Catches typos/made-up numbers (transposed digits,
    "123456789", etc.) before we even try to look them up. NOTE: Children.child_id
    IS the real government ת"ז (imported from the "תעודת זהות ילד/ה" column —
    see family_views.py's bulk import / sqlizeforphones.py) — checksum validity
    here is a cheap pre-check with no DB hit; the actual existence/auto-match
    lookup against ChildrenLookup happens separately in _apply_recipient_fields."""
    s = str(id_number).strip()
    if not _ID_NUMBER_RE.match(s):
        return False
    s = s.zfill(9)
    total = 0
    for i, ch in enumerate(s):
        d = int(ch) * (1 if i % 2 == 0 else 2)
        total += d - 9 if d > 9 else d
    return total % 10 == 0


def _validate_recipient_data(data):
    """Returns an error message string, or None if the data is clean. Used by
    BOTH the public questionnaire submission AND the admin create/update
    endpoints (all fields are checked only-if-present, so it never enforces
    required-ness itself - that's each caller's own job). Public callers get
    this for free as their only barrier (no session); admin callers get it so
    a typo/oversized value fails with a clean 400 instead of a raw DB error,
    and so 'made up' values (e.g. child_treatment_status) can't sneak in via
    a direct API call either.
    Deliberately independent of whatever the React form validates client-side —
    a direct script/curl POST bypasses that entirely."""
    for field, max_len in _FIELD_MAX_LENGTHS.items():
        val = data.get(field)
        if val and len(str(val)) > max_len:
            return f"{field} ארוך מדי (מקסימום {max_len} תווים)."

    for field in ('case_description', 'notes'):
        val = data.get(field)
        if val and len(str(val)) > _TEXT_FIELD_MAX_LENGTH:
            return f"{field} ארוך מדי (מקסימום {_TEXT_FIELD_MAX_LENGTH} תווים)."

    phone = data.get('phone')
    if phone and not _ISRAELI_PHONE_RE.match(str(phone).replace('-', '').replace(' ', '')):
        return "מספר טלפון לא תקין (לדוגמה: 0541234567)."

    for field, label in (('parent_id_number', 'תעודת זהות ההורה'), ('child_id_number', 'תעודת זהות הילד')):
        val = data.get(field)
        if val and not _is_valid_israeli_id(val):
            return f"{label} אינה תקינה - נא לבדוק שוב."

    treatment_status = data.get('child_treatment_status')
    if treatment_status and treatment_status not in _CHILD_TREATMENT_STATUSES:
        return "מצב טיפול לא תקין."

    num_children = data.get('num_children_at_home')
    if num_children not in (None, ''):
        try:
            if not (0 <= int(num_children) <= 30):
                raise ValueError()
        except (ValueError, TypeError):
            return "מספר ילדים בבית לא תקין."

    return None


@conditional_csrf
@api_view(["GET"])
@ratelimit(key='ip', rate='30/m', method='GET', block=True)
def get_voucher_distribution_public_info(request, distribution_id):
    """PUBLIC: minimal info so the questionnaire page knows which template to
    render (עמותה / כללי) and can show a friendly "closed" message — nothing
    sensitive is exposed here (no amounts, no other recipients' data). Rate
    limited to slow down distribution_id enumeration/scraping."""
    try:
        distribution = VoucherDistribution.objects.get(distribution_id=distribution_id)
    except VoucherDistribution.DoesNotExist:
        return JsonResponse({"error": "החלוקה לא נמצאה."}, status=404)

    if distribution.questionnaire_type == VoucherDistribution.QuestionnaireType.NONE:
        return JsonResponse({"error": "לחלוקה זו אין שאלון ציבורי."}, status=404)

    return JsonResponse({
        "id": distribution.distribution_id,
        "name": distribution.name,
        "questionnaire_type": distribution.questionnaire_type,
        "is_completed": distribution.is_completed,
    }, status=200)


@conditional_csrf
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def submit_voucher_questionnaire(request, distribution_id):
    """PUBLIC: a family (no account, no session) submits the questionnaire for
    one distribution. Creates a VoucherRecipient row with submitted_at=now().
    Required fields depend on the distribution's questionnaire_type.

    Rate limited (5/min/IP, same as register_send_totp) — a genuine family
    fills this out once; anything faster is scripted flooding, not a person.
    """
    api_logger.info(f"submit_voucher_questionnaire called for distribution_id={distribution_id}")

    try:
        distribution = VoucherDistribution.objects.get(distribution_id=distribution_id)
    except VoucherDistribution.DoesNotExist:
        return JsonResponse({"error": "החלוקה לא נמצאה."}, status=404)

    if distribution.questionnaire_type == VoucherDistribution.QuestionnaireType.NONE:
        return JsonResponse({"error": "לחלוקה זו אין שאלון ציבורי."}, status=404)

    if distribution.is_completed:
        return JsonResponse({"error": "החלוקה הזו הסתיימה ואינה מקבלת פניות נוספות."}, status=400)

    data = request.data

    # Honeypot: a field named "website" kept visually hidden in the real form —
    # real users never see or fill it in, bots that blindly fill every input
    # do. Respond as if it succeeded so a bot doesn't learn it was caught.
    if data.get('website'):
        api_logger.warning(f"submit_voucher_questionnaire: honeypot triggered for distribution {distribution_id}")
        return JsonResponse({"message": "הפנייה נשלחה בהצלחה. תודה!"}, status=201)

    required_fields = ['full_name', 'phone']
    if distribution.questionnaire_type == VoucherDistribution.QuestionnaireType.ORGANIZATION:
        required_fields += ['child_name', 'child_id_number']
    else:  # כללי
        required_fields += ['referral_source']

    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

    validation_error = _validate_recipient_data(data)
    if validation_error:
        return JsonResponse({"error": validation_error}, status=400)

    try:
        with transaction.atomic():
            recipient = VoucherRecipient(distribution=distribution, submitted_at=timezone.now())
            _apply_recipient_fields(recipient, data, updated_by=None)
            recipient.save()

        log_api_action(request=request, action='SUBMIT_VOUCHER_QUESTIONNAIRE', success=True,
                       status_code=201, entity_type='VoucherRecipient',
                       entity_ids=[recipient.recipient_id],
                       affected_tables=['childsmile_app_voucherrecipient'])
        return JsonResponse({"message": "הפנייה נשלחה בהצלחה. תודה!"}, status=201)

    except Exception as e:
        api_logger.error(f"submit_voucher_questionnaire error: {e}")
        log_api_action(request=request, action='SUBMIT_VOUCHER_QUESTIONNAIRE_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)

