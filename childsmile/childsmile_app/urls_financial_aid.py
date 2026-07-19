"""
URL configuration for Financial Aid (סיוע כספי).
Included under /api/financial-aid/ from main urls.py.
ADMIN-ONLY module — see financial_aid_views.py docstring.
"""

from django.urls import path
from .financial_aid_views import (
    get_financial_aid,
    create_financial_aid,
    update_financial_aid,
    delete_financial_aid,
    delete_financial_aid_attachment,
    get_financial_aid_upload_url,
    local_upload_financial_aid_file,
    serve_local_financial_aid_file,
    get_family_options,
    get_financial_aid_by_child,
)

urlpatterns = [
    path("", get_financial_aid, name="get_financial_aid"),
    path("create/", create_financial_aid, name="create_financial_aid"),
    path("update/<int:financial_aid_id>/", update_financial_aid, name="update_financial_aid"),
    path("delete/<int:financial_aid_id>/", delete_financial_aid, name="delete_financial_aid"),
    path("attachment/delete/<int:attachment_id>/", delete_financial_aid_attachment, name="delete_financial_aid_attachment"),
    path("upload-url/", get_financial_aid_upload_url, name="get_financial_aid_upload_url"),
    path("upload-local/", local_upload_financial_aid_file, name="local_upload_financial_aid_file"),
    path("file/<path:blob_path>", serve_local_financial_aid_file, name="serve_local_financial_aid_file"),
    path("family-options/", get_family_options, name="get_family_options"),
    path("by-child/<int:child_id>/", get_financial_aid_by_child, name="get_financial_aid_by_child"),
]
