"""
URL configuration for Fun Days & House Visits (ימי כיף וביקורי בית).
Included under /api/activities/ from main urls.py.
Board (rounds + requests) is coordinator/admin-gated; /public/ routes are
unauthenticated (see activity_views.py docstring).
"""

from django.urls import path
from .activity_views import (
    get_activity_rounds,
    create_activity_round,
    update_activity_round,
    delete_activity_round,
    get_activity_requests,
    create_activity_request,
    update_activity_request,
    delete_activity_request,
    get_available_activities,
    get_my_activities,
    assign_self_to_activity,
    leave_activity,
    get_activity_public_info,
    submit_activity_request,
)

urlpatterns = [
    # Rounds (coordinator/admin)
    path("rounds/", get_activity_rounds, name="get_activity_rounds"),
    path("rounds/create/", create_activity_round, name="create_activity_round"),
    path("rounds/update/<int:round_id>/", update_activity_round, name="update_activity_round"),
    path("rounds/delete/<int:round_id>/", delete_activity_round, name="delete_activity_round"),

    # Requests board (coordinator/admin)
    path("requests/", get_activity_requests, name="get_activity_requests"),
    path("requests/create/", create_activity_request, name="create_activity_request"),
    path("requests/update/<int:request_id>/", update_activity_request, name="update_activity_request"),
    path("requests/delete/<int:request_id>/", delete_activity_request, name="delete_activity_request"),

    # Volunteer self-service (authenticated)
    path("available/", get_available_activities, name="get_available_activities"),
    path("mine/", get_my_activities, name="get_my_activities"),
    path("assign-self/<int:request_id>/", assign_self_to_activity, name="assign_self_to_activity"),
    path("leave/<int:request_id>/", leave_activity, name="leave_activity"),

    # PUBLIC — no authentication (see activity_views.py docstring)
    path("public/<int:round_id>/", get_activity_public_info, name="get_activity_public_info"),
    path("public/<int:round_id>/submit/", submit_activity_request, name="submit_activity_request"),
]
