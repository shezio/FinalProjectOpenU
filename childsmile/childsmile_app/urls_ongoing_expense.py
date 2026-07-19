"""
URL configuration for Ongoing Expenses (הוצאות שוטפות).
Included under /api/ongoing-expenses/ from main urls.py.
ADMIN-ONLY module — see ongoing_expense_views.py docstring.
"""

from django.urls import path
from .ongoing_expense_views import (
    get_ongoing_expenses,
    create_ongoing_expense,
    update_ongoing_expense,
    delete_ongoing_expense,
    send_monthly_expenses_summary_now,
)

urlpatterns = [
    path("", get_ongoing_expenses, name="get_ongoing_expenses"),
    path("create/", create_ongoing_expense, name="create_ongoing_expense"),
    path("update/<int:ongoing_expense_id>/", update_ongoing_expense, name="update_ongoing_expense"),
    path("delete/<int:ongoing_expense_id>/", delete_ongoing_expense, name="delete_ongoing_expense"),
    path("send-monthly-summary-now/", send_monthly_expenses_summary_now, name="send_monthly_expenses_summary_now"),
]
