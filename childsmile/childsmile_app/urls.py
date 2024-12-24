from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FamilyViewSet, FamilyMemberViewSet, PermissionsViewSet, StaffViewSet, TutorViewSet, TutorshipViewSet

router = DefaultRouter()
router.register(r'families', FamilyViewSet)
router.register(r'family-members', FamilyMemberViewSet)
router.register(r'permissions', PermissionsViewSet)
router.register(r'staff', StaffViewSet)
router.register(r'tutors', TutorViewSet)
router.register(r'tutorships', TutorshipViewSet)

urlpatterns = [
    path('', include(router.urls)),
]