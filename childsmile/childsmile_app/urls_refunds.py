"""
URL configuration for Expense Refunds (החזרי הוצאות).
Included under /api/refunds/ from main urls.py.
"""

from django.urls import path
from .refund_views import (
    get_refunds,
    create_refund,
    update_refund,
    delete_refund,
    get_refund_phone_hint,
    get_receipt_upload_url,
    local_upload_receipt,
    serve_local_receipt,
    import_refunds,
)

urlpatterns = [
    path("", get_refunds, name="get_refunds"),
    path("create/", create_refund, name="create_refund"),
    path("update/<int:refund_id>/", update_refund, name="update_refund"),
    path("delete/<int:refund_id>/", delete_refund, name="delete_refund"),
    path("phone-hint/", get_refund_phone_hint, name="get_refund_phone_hint"),
    path("upload-url/", get_receipt_upload_url, name="get_receipt_upload_url"),
    path("upload-local/", local_upload_receipt, name="local_upload_receipt"),
    path("file/<path:blob_path>", serve_local_receipt, name="serve_local_receipt"),
    path("import/", import_refunds, name="import_refunds"),
]
