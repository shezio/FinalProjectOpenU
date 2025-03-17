from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
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
    VolunteerFeedbackReportView,
    TutorToFamilyAssignmentReportView,
    FamiliesWaitingForTutorsReportView,
    DepartedFamiliesReportView,
    NewFamiliesLastMonthReportView,
    FamilyDistributionByCitiesReportView,
    PotentialTutorshipMatchReportView,
    login_view,
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
    path('reports/volunteer-feedback/', VolunteerFeedbackReportView.as_view(), name='volunteer_feedback_report'),
    path('reports/tutor-to-family-assignment/', TutorToFamilyAssignmentReportView.as_view(), name='tutor_to_family_assignment_report'),
    path('reports/families-waiting-for-tutors/', FamiliesWaitingForTutorsReportView.as_view(), name='families_waiting_for_tutors_report'),
    path('reports/departed-families/', DepartedFamiliesReportView.as_view(), name='departed_families_report'),
    path('reports/new-families-last-month/', NewFamiliesLastMonthReportView.as_view(), name='new_families_last_month_report'),
    path('reports/family-distribution-by-cities/', FamilyDistributionByCitiesReportView.as_view(), name='family_distribution_by_cities_report'),
    path('reports/potential-tutorship-match/', PotentialTutorshipMatchReportView.as_view(), name='potential_tutorship_match_report'),
    path('api/login/', login_view, name='login'),
]