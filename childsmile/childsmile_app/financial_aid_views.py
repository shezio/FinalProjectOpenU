"""
Financial Aid Views (סיוע כספי לנתמכים)

Endpoints:
  GET    /api/financial-aid/                          – list all entries (admin only)
  POST   /api/financial-aid/create/                    – create a new entry (admin only)
  PUT    /api/financial-aid/update/<id>/                – update an entry (admin only)
  DELETE /api/financial-aid/delete/<id>/                – hard delete an entry + its attachments (admin only)
  DELETE /api/financial-aid/attachment/delete/<id>/     – remove a single attachment (admin only)
  GET    /api/financial-aid/upload-url/                 – pre-signed Azure Blob upload URL (admin only)
  PUT    /api/financial-aid/upload-local/                – LOCAL DEV ONLY raw file upload
  GET    /api/financial-aid/file/<path>                  – LOCAL DEV ONLY serve an uploaded file
  GET    /api/financial-aid/family-options/              – lightweight family search for the family picker (admin only)
  GET    /api/financial-aid/by-child/<child_id>/          – aid history for one family (admin only) —
                                                            feeds the "Financial Aid history" section
                                                            added to the family details modal in Families.js

Security rules:
  - ADMIN-ONLY (System Administrator / Viewer, see utils.is_admin) — same shape as
    Petty Cash / Ongoing Expenses; every endpoint requires an authenticated session
    AND is_admin(staff), anyone else gets 403 immediately. Sensitive personal/financial
    data about supported families — no coordinator/volunteer access for now.
"""

import os
import uuid
import datetime

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import JsonResponse, FileResponse
from rest_framework.decorators import api_view

from .models import Staff, Children, FinancialAid, FinancialAidAttachment
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


def _financial_aid_to_dict(entry):
    return {
        "id": entry.financial_aid_id,
        "family_name": entry.family_name,
        "aid_date": entry.aid_date.strftime("%Y-%m-%d"),
        "amount": str(entry.amount),
        "method": entry.method,
        "notes": entry.notes,
        "linked_child_id": entry.linked_child_id,
        "linked_child_name": (
            f"{entry.linked_child.childfirstname} {entry.linked_child.childsurname}"
            if entry.linked_child_id and entry.linked_child else None
        ),
        "created_at": entry.created_at.strftime("%d/%m/%Y %H:%M"),
        "updated_at": entry.updated_at.strftime("%d/%m/%Y %H:%M"),
        "updated_by": entry.updated_by,
        "attachments": [
            {"id": a.attachment_id, "file_url": a.file_url, "file_name": a.file_name}
            for a in entry.attachments.all()
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET FINANCIAL AID (list)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_financial_aid(request):
    api_logger.info("get_financial_aid called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='VIEW_FINANCIAL_AID_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='VIEW_FINANCIAL_AID_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = FinancialAid.objects.select_related('linked_child').prefetch_related('attachments').all()

    financial_aid_data = [_financial_aid_to_dict(entry) for entry in qs]

    log_api_action(request=request, action='VIEW_FINANCIAL_AID', success=True,
                   status_code=200, entity_type='FinancialAid',
                   affected_tables=['childsmile_app_financialaid'])
    return JsonResponse({"financial_aid": financial_aid_data}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# CREATE FINANCIAL AID
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_financial_aid(request):
    api_logger.info("create_financial_aid called")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='CREATE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Not authenticated", status_code=403)
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='CREATE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403)
        return JsonResponse({"detail": "Forbidden."}, status=403)

    data = request.data

    required_fields = ['family_name', 'aid_date', 'amount', 'method']
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return JsonResponse({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

    try:
        amount = Decimal(str(data['amount']))
        if amount <= 0:
            raise ValueError()
    except (InvalidOperation, ValueError):
        return JsonResponse({"error": "amount must be a positive number."}, status=400)

    linked_child_id = data.get('linked_child_id') or None
    if linked_child_id:
        try:
            Children.objects.get(child_id=linked_child_id)
        except Children.DoesNotExist:
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    try:
        with transaction.atomic():
            entry = FinancialAid.objects.create(
                family_name=data['family_name'],
                aid_date=data['aid_date'],
                amount=amount,
                method=data['method'],
                notes=data.get('notes') or None,
                linked_child_id=linked_child_id,
                updated_by=staff.username,
            )
            for att in (data.get('attachments') or []):
                if att.get('file_url'):
                    FinancialAidAttachment.objects.create(
                        financial_aid=entry,
                        file_url=att['file_url'],
                        file_name=att.get('file_name') or None,
                    )

        log_api_action(request=request, action='CREATE_FINANCIAL_AID', success=True,
                       status_code=201, entity_type='FinancialAid',
                       entity_ids=[entry.financial_aid_id],
                       affected_tables=['childsmile_app_financialaid', 'childsmile_app_financialaidattachment'])
        return JsonResponse({"message": "רישום הסיוע נוסף בהצלחה.", "id": entry.financial_aid_id}, status=201)

    except Exception as e:
        api_logger.error(f"create_financial_aid error: {e}")
        log_api_action(request=request, action='CREATE_FINANCIAL_AID_FAILED',
                       success=False, error_message=str(e), status_code=500)
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# UPDATE FINANCIAL AID
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_financial_aid(request, financial_aid_id):
    api_logger.info(f"update_financial_aid called for financial_aid_id={financial_aid_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='UPDATE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[financial_aid_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='UPDATE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Forbidden – admins only",
                       status_code=403, entity_ids=[financial_aid_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = FinancialAid.objects.get(financial_aid_id=financial_aid_id)
    except FinancialAid.DoesNotExist:
        return JsonResponse({"error": "רישום הסיוע לא נמצא."}, status=404)

    data = request.data

    if 'linked_child_id' in data and data['linked_child_id']:
        try:
            Children.objects.get(child_id=data['linked_child_id'])
        except Children.DoesNotExist:
            return JsonResponse({"error": "המשפחה המקושרת לא נמצאה."}, status=404)

    try:
        if 'family_name' in data:
            entry.family_name = data['family_name']
        if 'aid_date' in data:
            entry.aid_date = data['aid_date']
        if 'amount' in data:
            try:
                entry.amount = Decimal(str(data['amount']))
            except (InvalidOperation, ValueError):
                return JsonResponse({"error": "amount לא תקין."}, status=400)
        if 'method' in data:
            entry.method = data['method']
        if 'notes' in data:
            entry.notes = data['notes'] or None
        if 'linked_child_id' in data:
            entry.linked_child_id = data['linked_child_id'] or None

        entry.updated_by = staff.username
        entry.save()

        for att in (data.get('attachments') or []):
            if att.get('file_url'):
                FinancialAidAttachment.objects.create(
                    financial_aid=entry,
                    file_url=att['file_url'],
                    file_name=att.get('file_name') or None,
                )

        log_api_action(request=request, action='UPDATE_FINANCIAL_AID', success=True,
                       status_code=200, entity_type='FinancialAid',
                       entity_ids=[financial_aid_id],
                       affected_tables=['childsmile_app_financialaid', 'childsmile_app_financialaidattachment'])
        return JsonResponse({"message": "רישום הסיוע עודכן בהצלחה."}, status=200)

    except Exception as e:
        api_logger.error(f"update_financial_aid error: {e}")
        log_api_action(request=request, action='UPDATE_FINANCIAL_AID_FAILED',
                       success=False, error_message=str(e), status_code=500,
                       entity_ids=[financial_aid_id])
        return JsonResponse({"error": "שגיאת שרת. אנא נסה שוב."}, status=500)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE FINANCIAL AID  (hard delete — admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_financial_aid(request, financial_aid_id):
    api_logger.info(f"delete_financial_aid called for financial_aid_id={financial_aid_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        log_api_action(request=request, action='DELETE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Not authenticated", status_code=403,
                       entity_ids=[financial_aid_id])
        return err

    if not is_admin(staff):
        log_api_action(request=request, action='DELETE_FINANCIAL_AID_FAILED',
                       success=False, error_message="Forbidden – admins only", status_code=403,
                       entity_ids=[financial_aid_id])
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        entry = FinancialAid.objects.get(financial_aid_id=financial_aid_id)
    except FinancialAid.DoesNotExist:
        return JsonResponse({"error": "רישום הסיוע לא נמצא."}, status=404)

    # Delete each attachment's blob from Azure before removing the DB rows
    # (DB rows themselves cascade-delete automatically via the FK).
    if settings.IS_PROD:
        for att in entry.attachments.all():
            _delete_blob_if_prod(att.file_url)

    entry.delete()

    log_api_action(request=request, action='DELETE_FINANCIAL_AID', success=True,
                   status_code=200, entity_type='FinancialAid', entity_ids=[financial_aid_id],
                   affected_tables=['childsmile_app_financialaid', 'childsmile_app_financialaidattachment'],
                   additional_data={"deleted_by": staff.username})
    return JsonResponse({"message": "רישום הסיוע נמחק בהצלחה."}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# DELETE A SINGLE ATTACHMENT  (admin only) — remove one file without deleting the record
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_financial_aid_attachment(request, attachment_id):
    api_logger.info(f"delete_financial_aid_attachment called for attachment_id={attachment_id}")

    staff, err = _get_authenticated_user(request)
    if err:
        return err

    if not is_admin(staff):
        return JsonResponse({"detail": "Forbidden."}, status=403)

    try:
        att = FinancialAidAttachment.objects.get(attachment_id=attachment_id)
    except FinancialAidAttachment.DoesNotExist:
        return JsonResponse({"error": "הקובץ לא נמצא."}, status=404)

    financial_aid_id = att.financial_aid_id
    if settings.IS_PROD:
        _delete_blob_if_prod(att.file_url)
    att.delete()

    log_api_action(request=request, action='DELETE_FINANCIAL_AID_ATTACHMENT', success=True,
                   status_code=200, entity_type='FinancialAidAttachment', entity_ids=[attachment_id],
                   affected_tables=['childsmile_app_financialaidattachment'],
                   additional_data={"financial_aid_id": financial_aid_id, "deleted_by": staff.username})
    return JsonResponse({"message": "הקובץ נמחק בהצלחה."}, status=200)


def _delete_blob_if_prod(file_url):
    """Best-effort delete of an Azure blob given its full URL. Never raises."""
    try:
        from azure.storage.blob import BlobServiceClient
        conn_str = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        container = os.getenv('AZURE_FINANCIAL_AID_CONTAINER', 'financial-aid-docs')
        if conn_str and file_url:
            url_path = file_url.split(f"/{container}/", 1)
            if len(url_path) == 2:
                blob_name = url_path[1].split("?")[0]  # strip any SAS query string
                service = BlobServiceClient.from_connection_string(conn_str)
                service.get_blob_client(container=container, blob=blob_name).delete_blob()
                api_logger.info(f"financial aid: blob deleted — {blob_name}")
    except Exception as blob_err:
        # Log but don't block DB deletion — blob has its own lifecycle anyway.
        api_logger.warning(f"financial aid: blob deletion failed for {file_url}: {blob_err}")


# ──────────────────────────────────────────────────────────────────────────────
# AZURE BLOB STORAGE — Pre-signed upload URL (admin only — whole module is admin-only,
# unlike Refunds' equivalent endpoint which is open to any authenticated user because
# ANY staff/volunteer can submit a refund request with a receipt).
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_financial_aid_upload_url(request):
    """
    PROD: Returns a short-lived Azure Blob SAS URL for direct browser upload.
    LOCAL (IS_PROD=False): Returns a fake upload_url pointing at our own local
      upload endpoint so the frontend flow stays identical either way.
    """
    api_logger.info("get_financial_aid_upload_url called")

    staff, err = _get_authenticated_user(request)
    if err:
        return err

    if not is_admin(staff):
        return JsonResponse({"detail": "Forbidden."}, status=403)

    filename = request.GET.get('filename', 'document')
    safe_filename = os.path.basename(filename)

    if not settings.IS_PROD:
        unique_id = uuid.uuid4().hex[:12]
        blob_name = f"financial-aid/{staff.staff_id}/{unique_id}_{safe_filename}"
        local_upload_url = request.build_absolute_uri(f"/api/financial-aid/upload-local/?blob={blob_name}")
        local_blob_url = request.build_absolute_uri(f"/api/financial-aid/file/{blob_name}")
        return JsonResponse({"upload_url": local_upload_url, "blob_url": local_blob_url}, status=200)

    try:
        from azure.storage.blob import generate_blob_sas, BlobSasPermissions
        from datetime import timezone as dt_timezone

        connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        account_name = os.getenv('AZURE_STORAGE_ACCOUNT_NAME')
        account_key = os.getenv('AZURE_STORAGE_ACCOUNT_KEY')
        container = os.getenv('AZURE_FINANCIAL_AID_CONTAINER', 'financial-aid-docs')

        if not all([connection_string, account_name, account_key]):
            api_logger.error("Azure Blob Storage credentials not configured.")
            return JsonResponse({"error": "File upload is not configured."}, status=503)

        ts = datetime.datetime.now(dt_timezone.utc).strftime("%Y%m%d%H%M%S")
        blob_name = f"financial-aid/{staff.staff_id}/{ts}_{safe_filename}"

        expiry = datetime.datetime.now(dt_timezone.utc) + datetime.timedelta(minutes=15)
        sas_token = generate_blob_sas(
            account_name=account_name,
            container_name=container,
            blob_name=blob_name,
            account_key=account_key,
            permission=BlobSasPermissions(write=True, create=True),
            expiry=expiry,
        )

        upload_url = f"https://{account_name}.blob.core.windows.net/{container}/{blob_name}?{sas_token}"
        blob_url = f"https://{account_name}.blob.core.windows.net/{container}/{blob_name}"
        return JsonResponse({"upload_url": upload_url, "blob_url": blob_url}, status=200)

    except ImportError:
        api_logger.error("azure-storage-blob package not installed.")
        return JsonResponse({"error": "Azure SDK not installed."}, status=503)
    except Exception as e:
        api_logger.error(f"get_financial_aid_upload_url error: {e}")
        return JsonResponse({"error": "שגיאה ביצירת URL להעלאה."}, status=500)


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def local_upload_financial_aid_file(request):
    """LOCAL DEV ONLY — receives the raw file body PUT by the frontend and saves it
    to Django's default file storage (MEDIA_ROOT/financial-aid/...)."""
    if settings.IS_PROD:
        return JsonResponse({"error": "Not available in production."}, status=403)

    blob_name = request.GET.get('blob', '')
    if not blob_name:
        return JsonResponse({"error": "Missing blob param."}, status=400)

    try:
        content = request.body
        path = default_storage.save(blob_name, ContentFile(content))
        api_logger.info(f"local_upload_financial_aid_file saved: {path}")
        return JsonResponse({"saved": path}, status=200)
    except Exception as e:
        api_logger.error(f"local_upload_financial_aid_file error: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def serve_local_financial_aid_file(request, blob_path):
    """LOCAL DEV ONLY — serves a previously uploaded file."""
    if settings.IS_PROD:
        return JsonResponse({"error": "Not available in production."}, status=403)
    try:
        f = default_storage.open(blob_path)
        return FileResponse(f)
    except Exception:
        return JsonResponse({"error": "File not found."}, status=404)


# ──────────────────────────────────────────────────────────────────────────────
# FAMILY OPTIONS  (lightweight search, feeds the family combo-picker — admin only)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_family_options(request):
    """
    GET: Lightweight family list (id/name/city only) for the Financial Aid family
    picker. Deliberately NOT reusing family_views.get_complete_family_details (that
    endpoint returns 25+ fields per family for the full Families page - overkill and
    unnecessarily heavy for a simple search dropdown).
    """
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    if not is_admin(staff):
        return JsonResponse({"detail": "Forbidden."}, status=403)

    families = Children.objects.all().order_by('childfirstname', 'childsurname')
    options = [
        {
            "id": c.child_id,
            "name": f"{c.childfirstname} {c.childsurname}",
            "city": c.city,
        }
        for c in families
    ]
    return JsonResponse({"families": options}, status=200)


# ──────────────────────────────────────────────────────────────────────────────
# FINANCIAL AID HISTORY FOR ONE FAMILY  (feeds Families.js family details modal)
# ──────────────────────────────────────────────────────────────────────────────

@conditional_csrf
@api_view(["GET"])
def get_financial_aid_by_child(request, child_id):
    """GET: Financial aid history for ONE registered family - the read-only
    'Financial Aid history' section in the family details modal (Families.js)
    lazy-fetches this when the modal opens, keyed by child_id."""
    staff, err = _get_authenticated_user(request)
    if err:
        return err

    if not is_admin(staff):
        return JsonResponse({"detail": "Forbidden."}, status=403)

    qs = FinancialAid.objects.filter(linked_child_id=child_id).order_by('-aid_date')
    return JsonResponse({"financial_aid": [_financial_aid_to_dict(entry) for entry in qs]}, status=200)
