"""
URL configuration for Petty Cash (קופה קטנה).
Included under /api/petty-cash/ from main urls.py.
ADMIN-ONLY module — see petty_cash_views.py docstring.
"""

from django.urls import path
from .petty_cash_views import (
    get_petty_cash,
    create_petty_cash,
    update_petty_cash,
    delete_petty_cash,
)

urlpatterns = [
    path("", get_petty_cash, name="get_petty_cash"),
    path("create/", create_petty_cash, name="create_petty_cash"),
    path("update/<int:petty_cash_id>/", update_petty_cash, name="update_petty_cash"),
    path("delete/<int:petty_cash_id>/", delete_petty_cash, name="delete_petty_cash"),
]
