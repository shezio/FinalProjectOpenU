"""
URL configuration for Vouchers (חלוקת תלושים).
Included under /api/vouchers/ from main urls.py.
Admin-only EXCEPT the /public/ routes — see voucher_views.py docstring.
"""

from django.urls import path
from .voucher_views import (
    get_voucher_distributions,
    create_voucher_distribution,
    update_voucher_distribution,
    delete_voucher_distribution,
    get_voucher_recipients,
    create_voucher_recipient,
    update_voucher_recipient,
    delete_voucher_recipient,
    get_voucher_distribution_public_info,
    submit_voucher_questionnaire,
)

urlpatterns = [
    path("distributions/", get_voucher_distributions, name="get_voucher_distributions"),
    path("distributions/create/", create_voucher_distribution, name="create_voucher_distribution"),
    path("distributions/update/<int:distribution_id>/", update_voucher_distribution, name="update_voucher_distribution"),
    path("distributions/delete/<int:distribution_id>/", delete_voucher_distribution, name="delete_voucher_distribution"),

    path("recipients/", get_voucher_recipients, name="get_voucher_recipients"),
    path("recipients/create/", create_voucher_recipient, name="create_voucher_recipient"),
    path("recipients/update/<int:recipient_id>/", update_voucher_recipient, name="update_voucher_recipient"),
    path("recipients/delete/<int:recipient_id>/", delete_voucher_recipient, name="delete_voucher_recipient"),

    # PUBLIC — no authentication (see voucher_views.py docstring)
    path("public/<int:distribution_id>/", get_voucher_distribution_public_info, name="get_voucher_distribution_public_info"),
    path("public/<int:distribution_id>/submit/", submit_voucher_questionnaire, name="submit_voucher_questionnaire"),
]
