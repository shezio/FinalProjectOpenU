"""
Ongoing Expenses Views (הוצאות שוטפות)

Endpoints:
  GET    /api/ongoing-expenses/                 – list all entries (admin only)
  POST   /api/ongoing-expenses/create/          – create a new entry (admin only)
  PUT    /api/ongoing-expenses/update/<id>/     – update an entry (admin only)
  DELETE /api/ongoing-expenses/delete/<id>/     – hard delete an entry (admin only)

Security rules:
  - ADMIN-ONLY for now (System Administrator / Viewer, see utils.is_admin). Same
    shape as Petty Cash — every endpoint (including the list GET) requires an
    authenticated session AND is_admin(staff); anyone else gets 403 immediately.
"""

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.http import JsonResponse
from rest_framework.decorators import api_view

from .models import Staff, OngoingExpense
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
# GET ONGOING EXPENSES (list)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_ongoing_expenses(request):
    api_logger.info("get_ongoing_expenses called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='VIEW_ONGOING_EXPENSES_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='VIEW_ONGOING_EXPENSES_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = OngoingExpense.objects.all().order_by('-expense_date', '-ongoing_expense_id')

    ongoing_expenses_data = []
    for o in qs:
        ongoing_expenses_data.append({
            "id": o.ongoing_expense_id,
            "expense_date": o.expense_date.strftime("%Y-%m-%d"),
            "expense_name": o.expense_name,
            "category": o.category,
            "amount": str(o.amount),
            "invoice_number": o.invoice_number,
            "notes": o.notes,
            "created_at": o.created_at.strftime("%d/%m/%Y %H:%M"),
            "updated_at": o.updated_at.strftime("%d/%m/%Y %H:%M"),
            "updated_by": o.updated_by,
        })

    log_api_action(request=request, action='VIEW_ONGOING_EXPENSES', success=True,
                   status_code=200, entity_type='OngoingExpense',
                   affected_tables=['childsmile_app_ongoingexpense'])
    return JsonResponse({"ongoing_expenses": ongoing_expenses_data}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# CREATE ONGOING EXPENSE
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_ongoing_expense(request):
    api_logger.info("create_ongoing_expense called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='CREATE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='CREATE_ONGOING_EXPENSE_FAILED',
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
            entry = OngoingExpense.objects.create(
                expense_date=data['expense_date'],
                expense_name=data['expense_name'],
                category=data.get('category') or None,
                amount=amount,
                invoice_number=data.get('invoice_number') or None,
                notes=data.get('notes') or None,
                updated_by=staff.username,
            )

        log_api_action(request=request, action='CREATE_ONGOING_EXPENSE', success=True,
                       status_code=201, entity_type='OngoingExpense',
                       entity_ids=[entry.ongoing_expense_id],
                       affected_tables=['childsmile_app_ongoingexpense'])
        return JsonResponse({"message": "ההוצאה נוספה בהצלחה.", "id": entry.ongoing_expense_id}, status=201)

    except Exception as e:
        api_logger.error(f"create_ongoing_expense error: {e}")
        log_api_action(request=request, action='CREATE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE ONGOING EXPENSE
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_ongoing_expense(request, ongoing_expense_id):
    api_logger.info(f"update_ongoing_expense called for ongoing_expense_id={ongoing_expense_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='UPDATE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[ongoing_expense_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='UPDATE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message="Forbidden – admins only",
                       status_code=403, entity_ids=[ongoing_expense_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = OngoingExpense.objects.get(ongoing_expense_id=ongoing_expense_id)
    except OngoingExpense.DoesNotExist:
        return JsonResponse({"error": "ההוצאה לא נמצאה."}, status=404)

    data = request.data

    try:
        if 'expense_date' in data:
            entry.expense_date = data['expense_date']
        if 'expense_name' in data:
            entry.expense_name = data['expense_name']
        if 'category' in data:
            entry.category = data['category'] or None
        if 'amount' in data:
            try:
                entry.amount = Decimal(str(data['amount']))
            except (InvalidOperation, ValueError):
                return JsonResponse({"error": "amount לא תקין."}, status=400)
        if 'invoice_number' in data:
            entry.invoice_number = data['invoice_number'] or None
        if 'notes' in data:
            entry.notes = data['notes'] or None

        entry.updated_by = staff.username
        entry.save()

        log_api_action(request=request, action='UPDATE_ONGOING_EXPENSE', success=True,
                       status_code=200, entity_type='OngoingExpense',
                       entity_ids=[ongoing_expense_id],
                       affected_tables=['childsmile_app_ongoingexpense'])
        return JsonResponse({"message": "ההוצאה עודכנה בהצלחה."}, status=200)

    except Exception as e:
        api_logger.error(f"update_ongoing_expense error: {e}")
        log_api_action(request=request, action='UPDATE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message=str(e), status_code=500,
                       entity_ids=[ongoing_expense_id])
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE ONGOING EXPENSE  (hard delete — admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_ongoing_expense(request, ongoing_expense_id):
    api_logger.info(f"delete_ongoing_expense called for ongoing_expense_id={ongoing_expense_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='DELETE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[ongoing_expense_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='DELETE_ONGOING_EXPENSE_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403,
                       entity_ids=[ongoing_expense_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = OngoingExpense.objects.get(ongoing_expense_id=ongoing_expense_id)
    except OngoingExpense.DoesNotExist:
        return JsonResponse({"error": "ההוצאה לא נמצאה."}, status=404)

    entry.delete()

    log_api_action(request=request, action='DELETE_ONGOING_EXPENSE', success=True,
                   status_code=200, entity_type='OngoingExpense', entity_ids=[ongoing_expense_id],
                   affected_tables=['childsmile_app_ongoingexpense'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "ההוצאה נמחקה בהצלחה."}, status=200)
