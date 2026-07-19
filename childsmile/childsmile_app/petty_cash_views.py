"""
Petty Cash Views (קופה קטנה)

Endpoints:
  GET    /api/petty-cash/                 – list all entries (admin only)
  POST   /api/petty-cash/create/          – create a new entry (admin only)
  PUT    /api/petty-cash/update/<id>/     – update an entry (admin only)
  DELETE /api/petty-cash/delete/<id>/     – hard delete an entry (admin only)

Security rules:
  - ADMIN-ONLY for now (System Administrator / Viewer, see utils.is_admin). Unlike
    Expense Refunds there is no volunteer-facing view - every endpoint (including
    the list GET) requires an authenticated session AND is_admin(staff); anyone
    else gets 403 immediately.
  - Rows created automatically from a paid Expense Refund (source_refund is set -
    see refund_views.py::_sync_petty_cash_for_refund) can still be edited/deleted
    like any other row; the link is informational only (shown as a badge in the UI).
"""

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import JsonResponse
from rest_framework.decorators import api_view

from .models import Staff, PettyCashExpense
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


# ──────────────────────────────────────────────────────────────────────────────
# GET PETTY CASH ENTRIES (list)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_petty_cash(request):
    api_logger.info("get_petty_cash called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='VIEW_PETTY_CASH_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='VIEW_PETTY_CASH_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = PettyCashExpense.objects.all().order_by('-expense_date', '-petty_cash_id')

    petty_cash_data = []
    for p in qs:
        petty_cash_data.append({
            "id": p.petty_cash_id,
            "expense_date": p.expense_date.strftime("%Y-%m-%d"),
            "expense_name": p.expense_name,
            "amount": str(p.amount),
            "paid_by": p.paid_by,
            "notes": p.notes,
            "created_at": p.created_at.strftime("%d/%m/%Y %H:%M"),
            "updated_at": p.updated_at.strftime("%d/%m/%Y %H:%M"),
            "updated_by": p.updated_by,
            "source_refund_id": p.source_refund_id,
        })

    log_api_action(request=request, action='VIEW_PETTY_CASH', success=True,
                   status_code=200, entity_type='PettyCashExpense',
                   affected_tables=['childsmile_app_pettycashexpense'])
    return JsonResponse({"petty_cash": petty_cash_data}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# CREATE PETTY CASH ENTRY
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_petty_cash(request):
    api_logger.info("create_petty_cash called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='CREATE_PETTY_CASH_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='CREATE_PETTY_CASH_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data

    required_fields = ['expense_date', 'expense_name', 'amount']
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

    try:
        amount = Decimal(str(data['amount']))
        if amount <= 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        return JsonResponse({"error": "amount must be a positive number."}, status=400)

    try:
        with transaction.atomic():
            entry = PettyCashExpense.objects.create(
                expense_date=data['expense_date'],
                expense_name=data['expense_name'],
                amount=amount,
                paid_by=data.get('paid_by') or None,
                notes=data.get('notes') or None,
                updated_by=staff.username,
            )

        log_api_action(request=request, action='CREATE_PETTY_CASH', success=True,
                       status_code=201, entity_type='PettyCashExpense',
                       entity_ids=[entry.petty_cash_id],
                       affected_tables=['childsmile_app_pettycashexpense'])
        return JsonResponse({"message": "ההוצאה נוספה בהצלחה.", "id": entry.petty_cash_id}, status=201)

    except Exception as e:
        api_logger.error(f"create_petty_cash error: {e}")
        log_api_action(request=request, action='CREATE_PETTY_CASH_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE PETTY CASH ENTRY
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_petty_cash(request, petty_cash_id):
    api_logger.info(f"update_petty_cash called for petty_cash_id={petty_cash_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='UPDATE_PETTY_CASH_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[petty_cash_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='UPDATE_PETTY_CASH_FAILED',
                       success=False, error_message="Forbidden – admins only",
                       status_code=403, entity_ids=[petty_cash_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = PettyCashExpense.objects.get(petty_cash_id=petty_cash_id)
    except PettyCashExpense.DoesNotExist:
        return JsonResponse({"error": "ההוצאה לא נמצאה."}, status=404)

    data = request.data

    try:
        if 'expense_date' in data:
            entry.expense_date = data['expense_date']
        if 'expense_name' in data:
            entry.expense_name = data['expense_name']
        if 'amount' in data:
            try:
                entry.amount = Decimal(str(data['amount']))
            except (InvalidOperation, ValueError):
                return JsonResponse({"error": "amount לא תקין."}, status=400)
        if 'paid_by' in data:
            entry.paid_by = data['paid_by'] or None
        if 'notes' in data:
            entry.notes = data['notes'] or None

        entry.updated_by = staff.username
        entry.save()

        log_api_action(request=request, action='UPDATE_PETTY_CASH', success=True,
                       status_code=200, entity_type='PettyCashExpense',
                       entity_ids=[petty_cash_id],
                       affected_tables=['childsmile_app_pettycashexpense'])
        return JsonResponse({"message": "ההוצאה עודכנה בהצלחה."}, status=200)

    except Exception as e:
        api_logger.error(f"update_petty_cash error: {e}")
        log_api_action(request=request, action='UPDATE_PETTY_CASH_FAILED',
                       success=False, error_message=str(e), status_code=500,
                       entity_ids=[petty_cash_id])
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE PETTY CASH ENTRY  (hard delete — admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_petty_cash(request, petty_cash_id):
    api_logger.info(f"delete_petty_cash called for petty_cash_id={petty_cash_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='DELETE_PETTY_CASH_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[petty_cash_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='DELETE_PETTY_CASH_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403,
                       entity_ids=[petty_cash_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = PettyCashExpense.objects.get(petty_cash_id=petty_cash_id)
    except PettyCashExpense.DoesNotExist:
        return JsonResponse({"error": "ההוצאה לא נמצאה."}, status=404)

    entry.delete()

    log_api_action(request=request, action='DELETE_PETTY_CASH', success=True,
                   status_code=200, entity_type='PettyCashExpense', entity_ids=[petty_cash_id],
                   affected_tables=['childsmile_app_pettycashexpense'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "ההוצאה נמחקה בהצלחה."}, status=200)

