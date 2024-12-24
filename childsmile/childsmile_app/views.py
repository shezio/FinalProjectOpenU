from rest_framework import viewsets
from .models import Family, FamilyMember, Permissions, Staff, Tutor, Tutorship
from .serializers import FamilySerializer, FamilyMemberSerializer, PermissionsSerializer, StaffSerializer, TutorSerializer, TutorshipSerializer

class FamilyViewSet(viewsets.ModelViewSet):
    queryset = Family.objects.all()
    serializer_class = FamilySerializer

class FamilyMemberViewSet(viewsets.ModelViewSet):
    queryset = FamilyMember.objects.all()
    serializer_class = FamilyMemberSerializer

class PermissionsViewSet(viewsets.ModelViewSet):
    queryset = Permissions.objects.all()
    serializer_class = PermissionsSerializer

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer

class TutorViewSet(viewsets.ModelViewSet):
    queryset = Tutor.objects.all()
    serializer_class = TutorSerializer

class TutorshipViewSet(viewsets.ModelViewSet):
    queryset = Tutorship.objects.all()
    serializer_class = TutorshipSerializer