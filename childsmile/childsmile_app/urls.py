from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    get_permissions,
    logout_view,
    get_children,
    get_tutors,
    get_staff,
    create_volunteer_or_tutor,
    get_pending_tutors,
    get_signedup,
    get_all_staff,
    update_staff_member,
    delete_staff_member,
    get_roles,
    create_staff_member,
    get_general_volunteers_not_pending,
    google_login_success,
    login_email,
    verify_totp,
    test_email_setup,
    test_gmail_auth,
    register_send_totp,
    register_verify_totp,
    staff_creation_send_totp,
    staff_creation_verify_totp,
)
from .task_views import (
    get_user_tasks,
    create_task,
    delete_task,
    update_task,
    update_task_status,
)
from .report_views import (
    get_families_per_location_report,
    get_new_families_report,
    families_waiting_for_tutorship_report,
    active_tutors_report,
    possible_tutorship_matches_report,
    volunteer_feedback_report,
    tutor_feedback_report,
    families_tutorships_stats,
    pending_tutors_stats,
    roles_spread_stats,
)
from .family_views import (
    get_complete_family_details,
    create_family,
    update_family,
    delete_family,
    get_initial_family_data,
    create_initial_family_data,
    update_initial_family_data,
    delete_initial_family_data,
    mark_initial_family_complete,
)
from .feedback_views import (
    create_tutor_feedback,
    update_tutor_feedback,
    delete_tutor_feedback,
    create_volunteer_feedback,
    update_volunteer_feedback,
    delete_volunteer_feedback,
)
from .tutorship_views import (
    calculate_possible_matches,
    get_tutorships,
    create_tutorship,
    update_tutorship,
    delete_tutorship,
)
from .tutor_volunteer_views import (
    update_general_volunteer,
    update_tutor,
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
    FeedbackViewSet,
    Tutor_FeedbackViewSet,
    General_V_FeedbackViewSet,
    TaskViewSet,
    PossibleMatchesViewSet,  # Add this line
)
from .audit_views import (
    get_audit_logs,
    get_audit_statistics,
    export_audit_logs,
    audit_action,
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
router.register(r"feedback", FeedbackViewSet)
router.register(r"tutor_feedback", Tutor_FeedbackViewSet)
router.register(r"general_v_feedback", General_V_FeedbackViewSet)
router.register(r"tasks", TaskViewSet)
router.register(r"possible_matches", PossibleMatchesViewSet)  # Add this line

urlpatterns = [
    path("", include(router.urls)),
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
    path(
        "api/get_signedup/",
        get_signedup,
        name="get_signedup",
    ),
    path(
        "api/delete_tutorship/<int:tutorship_id>/",
        delete_tutorship,
        name="delete_tutorship",
    ),
    path(
        "api/get_all_staff/",
        get_all_staff,
        name="get_all_staff",
    ),
    path(
        "api/update_staff_member/<int:staff_id>/",
        update_staff_member,
        name="update_staff_member",
    ),
    path(
        "api/delete_staff_member/<int:staff_id>/",
        delete_staff_member,
        name="delete_staff_member",
    ),
    path(
        "api/get_roles/",
        get_roles,
        name="get_roles",
    ),
    path(
        "api/create_staff_member/",
        create_staff_member,
        name="create_staff_member",
    ),
    path(
        "api/update_tutorship/<int:tutorship_id>/",
        update_tutorship,
        name="update_tutorship",
    ),
    path(
        "api/families_tutorships_stats/",
        families_tutorships_stats,
        name="families_tutorships_stats",
    ),
    path(
        "api/pending_tutors_stats/",
        pending_tutors_stats,
        name="pending_tutors_stats",
    ),
    path(
        "api/roles_spread_stats/",
        roles_spread_stats,
        name="roles_spread_stats",
    ),
    path(
        "api/create_tutor_feedback/",
        create_tutor_feedback,
        name="create_tutor_feedback",
    ),
    path(
        "api/update_tutor_feedback/<int:feedback_id>/",
        update_tutor_feedback,
        name="update_tutor_feedback",
    ),
    path(
        "api/delete_tutor_feedback/<int:feedback_id>/",
        delete_tutor_feedback,
        name="delete_tutor_feedback",
    ),
    path(
        "api/create_volunteer_feedback/",
        create_volunteer_feedback,
        name="create_volunteer_feedback",
    ),
    path(
        "api/update_volunteer_feedback/<int:feedback_id>/",
        update_volunteer_feedback,
        name="update_volunteer_feedback",
    ),
    path(
        "api/delete_volunteer_feedback/<int:feedback_id>/",
        delete_volunteer_feedback,
        name="delete_volunteer_feedback",
    ),
    path(
        "api/get_initial_family_data/",
        get_initial_family_data,
        name="get_initial_family_data",
    ),
    path(
        "api/create_initial_family_data/",
        create_initial_family_data,
        name="create_initial_family_data",
    ),
    path(
        "api/update_initial_family_data/<int:initial_family_data_id>/",
        update_initial_family_data,
        name="update_initial_family_data",
    ),
    path(
        "api/delete_initial_family_data/<int:initial_family_data_id>/",
        delete_initial_family_data,
        name="delete_initial_family_data",
    ),
    path(
        "api/mark_initial_family_complete/<int:initial_family_data_id>/",
        mark_initial_family_complete,
        name="mark_initial_family_complete",
    ),
    path(
        "api/get_general_volunteers_not_pending/",
        get_general_volunteers_not_pending,
        name="get_general_volunteers_not_pending",
    ),
    path(
        "api/update_general_volunteer/<int:volunteer_id>/",
        update_general_volunteer,
        name="update_general_volunteer",
    ),
    path(
        "api/update_tutor/<int:tutor_id>/",
        update_tutor,
        name="update_tutor",
    ),
    path(
        "api/google-login-success/",
        google_login_success,
        name="google_login_success",
    ),
    path("api/auth/login-email/", login_email, name="login_email"),
    path("api/auth/verify-totp/", verify_totp, name="verify_totp"),
    path("api/test-email-setup/", test_email_setup, name="test_email_setup"),
    path("api/test-gmail-auth/", test_gmail_auth, name="test_gmail_auth"),
    path("api/register-send-totp/", register_send_totp, name="register_send_totp"),
    path(
        "api/register-verify-totp/", register_verify_totp, name="register_verify_totp"
    ),
    path(
        "api/staff-creation-send-totp/",
        staff_creation_send_totp,
        name="staff_creation_send_totp",
    ),
    path(
        "api/staff-creation-verify-totp/",
        staff_creation_verify_totp,
        name="staff_creation_verify_totp",
    ),
    path("api/audit-logs/", get_audit_logs, name="get_audit_logs"),
    path("api/audit-statistics/", get_audit_statistics, name="get_audit_statistics"),
    path("api/audit-logs/export/", export_audit_logs, name="export_audit_logs"),
    path("api/audit-action/", audit_action, name="audit_action"),
]
