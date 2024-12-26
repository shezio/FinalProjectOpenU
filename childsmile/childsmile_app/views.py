from rest_framework import viewsets
from .models import (
    Family,
    FamilyMember,
    Permissions,
    Staff,
    Tutor,
    Tutorship,
    TutorshipStatus,
    Volunteer,
    Mature,
    HealthyKid,
)


class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.all()


class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()


class PermissionsViewSet(viewsets.ModelViewSet):
    queryset = Permissions.objects.all()


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()


class TutorViewSet(viewsets.ModelViewSet):
    queryset = Tutor.objects.all()


class TutorshipViewSet(viewsets.ModelViewSet):
    queryset = Tutorship.objects.all()


class TutorshipStatusViewSet(viewsets.ModelViewSet):
    queryset = TutorshipStatus.objects.all()


class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all()

class MatureViewSet(viewsets.ModelViewSet):
    queryset = Mature.objects.filter(is_active=True, date_of_birth__lte='2008-12-26')  # Adjust the date to ensure age > 16

class HealthyKidViewSet(viewsets.ModelViewSet):
    queryset = HealthyKid.objects.filter(is_active=True)