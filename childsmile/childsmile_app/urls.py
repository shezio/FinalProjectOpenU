from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FamilyViewSet,
    FamilyMemberViewSet,
    PermissionsViewSet,
    StaffViewSet,
    TutorViewSet,
    TutorshipViewSet,
    TutorshipStatusViewSet,
    VolunteerViewSet,
    MatureViewSet,
    HealthyKidViewSet,
    FeedbackViewSet,
    TutorFeedbackViewSet,
    VolunteerFeedbackViewSet,
    VolunteerFeedbackReportView,
    TutorToFamilyAssignmentReportView,
    FamiliesWaitingForTutorsReportView,
    DepartedFamiliesReportView,
    NewFamiliesLastMonthReportView,
    FamilyDistributionByCitiesReportView,
    PotentialTutorshipMatchReportView,
)

router = DefaultRouter()
router.register(r"families", FamilyViewSet)
router.register(r"family-members", FamilyMemberViewSet)
router.register(r"permissions", PermissionsViewSet)
router.register(r"staff", StaffViewSet)
router.register(r"tutors", TutorViewSet)
router.register(r"tutorships", TutorshipViewSet)
router.register(r"tutorship-statuses", TutorshipStatusViewSet)
router.register(r"volunteers", VolunteerViewSet)
router.register(r"matures", MatureViewSet)
router.register(r"healthy-kids", HealthyKidViewSet)
router.register(r"feedback", FeedbackViewSet)
router.register(r"tutor-feedback", TutorFeedbackViewSet)
router.register(r"volunteer-feedback", VolunteerFeedbackViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path('reports/volunteer-feedback/', VolunteerFeedbackReportView.as_view(), name='volunteer_feedback_report'),
    path('reports/tutor-to-family-assignment/', TutorToFamilyAssignmentReportView.as_view(), name='tutor_to_family_assignment_report'),
    path('reports/families-waiting-for-tutors/', FamiliesWaitingForTutorsReportView.as_view(), name='families_waiting_for_tutors_report'),
    path('reports/departed-families/', DepartedFamiliesReportView.as_view(), name='departed_families_report'),
    path('reports/new-families-last-month/', NewFamiliesLastMonthReportView.as_view(), name='new_families_last_month_report'),
    path('reports/family-distribution-by-cities/', FamilyDistributionByCitiesReportView.as_view(), name='family_distribution_by_cities_report'),
    path('reports/potential-tutorship-match/', PotentialTutorshipMatchReportView.as_view(), name='potential_tutorship_match_report'),
]
