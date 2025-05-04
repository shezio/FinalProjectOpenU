from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    login_view,
    get_permissions,
    logout_view,
    get_user_tasks,
    get_children,
    get_tutors,
    get_staff,
    create_task,
    delete_task,
    update_task,
    update_task_status,
    get_families_per_location_report,
    get_new_families_report,
    families_waiting_for_tutorship_report,
    active_tutors_report,
    possible_tutorship_matches_report,
    volunteer_feedback_report,
    tutor_feedback_report,
    create_volunteer_or_tutor,
    get_pending_tutors,
    get_complete_family_details,
    create_family,
    update_family,
    delete_family,
    calculate_possible_matches,
    get_tutorships,
    create_tutorship,
)

from .unused_views import (
    PermissionsViewSet,
    RoleViewSet,
    StaffViewSet,
    SignedUpViewSet,
    General_VolunteerViewSet,
    Pending_TutorViewSet,
    TutorsViewSet,
    ChildrenViewSet,
    TutorshipsViewSet,
    MaturesViewSet,
    HealthyViewSet,
    FeedbackViewSet,
    Tutor_FeedbackViewSet,
    General_V_FeedbackViewSet,
    TaskViewSet,
    PossibleMatchesViewSet,  # Add this line
)


router = DefaultRouter()
router.register(r"permissions", PermissionsViewSet)
router.register(r"roles", RoleViewSet)
router.register(r"staff", StaffViewSet)
router.register(r"signedup", SignedUpViewSet)
router.register(r"general_volunteers", General_VolunteerViewSet)
router.register(r"pending_tutors", Pending_TutorViewSet)
router.register(r"tutors", TutorsViewSet)
router.register(r"children", ChildrenViewSet)
router.register(r"tutorships", TutorshipsViewSet)
router.register(r"matures", MaturesViewSet)
router.register(r"healthy", HealthyViewSet)
router.register(r"feedback", FeedbackViewSet)
router.register(r"tutor_feedback", Tutor_FeedbackViewSet)
router.register(r"general_v_feedback", General_V_FeedbackViewSet)
router.register(r"tasks", TaskViewSet)
router.register(r"possible_matches", PossibleMatchesViewSet)  # Add this line

urlpatterns = [
    path("", include(router.urls)),
    path("api/login/", login_view, name="login"),
    path("api/permissions/", get_permissions, name="get_permissions"),
    path("api/logout/", logout_view, name="logout"),
    path("api/tasks/", get_user_tasks, name="get_user_tasks"),
    path("api/children/", get_children, name="get_children"),
    path("api/tutors/", get_tutors, name="get_tutors"),
    path("api/staff/", get_staff, name="get_staff"),
    path("api/tasks/create/", create_task, name="create_task"),
    path("api/tasks/delete/<int:task_id>/", delete_task, name="delete_task"),
    path("api/tasks/update/<int:task_id>/", update_task, name="update_task"),
    path(
        "api/tasks/update-status/<int:task_id>/",
        update_task_status,
        name="update_task_status",
    ),
    path(
        "api/reports/families-per-location-report/",
        get_families_per_location_report,
        name="get_families_per_location_report",
    ),
    path(
        "api/reports/new-families-report/",
        get_new_families_report,
        name="get_new_families_report",
    ),
    path(
        "api/reports/families-waiting-for-tutorship-report/",
        families_waiting_for_tutorship_report,
        name="families_waiting_for_tutorship_report",
    ),
    path(
        "api/reports/active-tutors-report/",
        active_tutors_report,
        name="active_tutors_report",
    ),
    path(
        "api/reports/possible-tutorship-matches-report/",
        possible_tutorship_matches_report,
        name="possible_tutorship_matches_report",
    ),
    path(
        "api/reports/volunteer-feedback-report/",
        volunteer_feedback_report,
        name="volunteer_feedback_report",
    ),
    path(
        "api/reports/tutor-feedback-report/",
        tutor_feedback_report,
        name="tutor_feedback_report",
    ),
    path(
        "api/create_volunteer_or_tutor/",
        create_volunteer_or_tutor,
        name="create_volunteer_or_tutor",
    ),
    path(
        "api/get_pending_tutors/",
        get_pending_tutors,
        name="get_pending_tutors",
    ),
    path(
        "api/get_complete_family_details/",
        get_complete_family_details,
        name="get_complete_family_details",
    ),
    path(
        "api/create_family/",
        create_family,
        name="create_family",
    ),
    path(
        "api/update_family/<int:child_id>/",
        update_family,
        name="update_family",
    ),
    path(
        "api/delete_family/<int:child_id>/",
        delete_family,
        name="delete_family",
    ),
    path(
        "api/calculate_possible_matches/",
        calculate_possible_matches,
        name="calculate_possible_matches",
    ),
    path(
        "api/get_tutorships/",
        get_tutorships,
        name="get_tutorships",
    ),
    path(
        "api/create_tutorship/",
        create_tutorship,
        name="create_tutorship",
    ),
]
