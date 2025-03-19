from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from .models import (
    Permissions,
    Role,
    Staff,
    SignedUp,
    General_Volunteer,
    Pending_Tutor,
    Tutors,
    Children,
    Tutorships,
    Matures,
    Healthy,
    Feedback,
    Tutor_Feedback,
    General_V_Feedback,
    Tasks,
    PossibleMatches,  # Add this line
)
import csv
import datetime

class PermissionsViewSet(viewsets.ModelViewSet):
    queryset = Permissions.objects.all()
    permission_classes = [IsAuthenticated]

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    permission_classes = [IsAuthenticated]

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    permission_classes = [IsAuthenticated]

class SignedUpViewSet(viewsets.ModelViewSet):
    queryset = SignedUp.objects.all()
    permission_classes = [IsAuthenticated]

class General_VolunteerViewSet(viewsets.ModelViewSet):
    queryset = General_Volunteer.objects.all()
    permission_classes = [IsAuthenticated]

class Pending_TutorViewSet(viewsets.ModelViewSet):
    queryset = Pending_Tutor.objects.all()
    permission_classes = [IsAuthenticated]

class TutorsViewSet(viewsets.ModelViewSet):
    queryset = Tutors.objects.all()
    permission_classes = [IsAuthenticated]

class ChildrenViewSet(viewsets.ModelViewSet):
    queryset = Children.objects.all()
    permission_classes = [IsAuthenticated]

class TutorshipsViewSet(viewsets.ModelViewSet):
    queryset = Tutorships.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def match_tutorship(self, request):
        tutor_id = request.data.get("tutor_id")
        child_id = request.data.get("child_id")

        tutor = Tutors.objects.get(id=tutor_id)
        child = Children.objects.get(child_id=child_id)

        geographic_proximity = self.calculate_geographic_proximity(tutor, child)
        gender_match = tutor.gender == child.gender

        if geographic_proximity <= 10 and gender_match:
            tutorship = Tutorships.objects.create(
                tutor=tutor,
                child=child,
                start_date=request.data.get("start_date"),
                status="Active",
                geographic_proximity=geographic_proximity,
                gender_match=gender_match,
            )
            return Response(
                {
                    "tutorship_id": tutorship.id,
                    "tutor_id": tutorship.tutor.id,
                    "child_id": tutorship.child.child_id,
                    "start_date": tutorship.start_date,
                    "status": tutorship.status,
                    "geographic_proximity": tutorship.geographic_proximity,
                    "gender_match": tutorship.gender_match,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"detail": "No suitable match found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def calculate_geographic_proximity(self, tutor, child):
        return 5.0

class MaturesViewSet(viewsets.ModelViewSet):
    queryset = Matures.objects.all()
    permission_classes = [IsAuthenticated]

class HealthyViewSet(viewsets.ModelViewSet):
    queryset = Healthy.objects.all()
    permission_classes = [IsAuthenticated]

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    permission_classes = [IsAuthenticated]

class Tutor_FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Tutor_Feedback.objects.all()
    permission_classes = [IsAuthenticated]

class General_V_FeedbackViewSet(viewsets.ModelViewSet):
    queryset = General_V_Feedback.objects.all()
    permission_classes = [IsAuthenticated]

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Tasks.objects.all()
    permission_classes = [IsAuthenticated]

class PossibleMatchesViewSet(viewsets.ModelViewSet):
    queryset = PossibleMatches.objects.all()
    permission_classes = [IsAuthenticated]

class VolunteerFeedbackReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        feedbacks = General_V_Feedback.objects.all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="volunteer_feedback_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Volunteer Name", "Feedback Date", "Feedback Content"])
        for feedback in feedbacks:
            writer.writerow(
                [
                    feedback.volunteer_name,
                    feedback.feedback.event_date,
                    feedback.feedback.description,
                ]
            )

        return response

class TutorToFamilyAssignmentReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        tutorships = Tutorships.objects.filter(status="Active")
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="tutor_to_family_assignment_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Tutor Name", "Tutee Name"])
        for tutorship in tutorships:
            writer.writerow(
                [
                    tutorship.tutor.staff.username,
                    tutorship.child.childfirstname + " " + tutorship.child.childsurname,
                ]
            )

        return response

class FamiliesWaitingForTutorsReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        children_without_tutors = Children.objects.filter(tutorships__isnull=True).distinct()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="families_waiting_for_tutors_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers"])
        for child in children_without_tutors:
            writer.writerow(
                [child.childfirstname + " " + child.childsurname, child.child_phone_number]
            )

        return response

class DepartedFamiliesReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        departed_children = Children.objects.filter(tutoring_status='Departed')
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="departed_families_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Child Name",
                "Parents Phone Numbers",
                "Departure Date",
                "Responsible Person",
                "Reason for Departure",
            ]
        )
        for child in departed_children:
            writer.writerow(
                [
                    child.childfirstname + " " + child.childsurname,
                    child.child_phone_number,
                    child.lastupdateddate,  # Assuming this is the departure date
                    child.responsible_coordinator,  # Assuming this is the responsible person
                    child.additional_info,  # Assuming this is the reason for departure
                ]
            )

        return response

class NewFamiliesLastMonthReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        last_month = datetime.date.today() - datetime.timedelta(days=30)
        new_children = Children.objects.filter(registrationdate__gte=last_month)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="new_families_last_month_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers", "Date of Joining"])
        for child in new_children:
            writer.writerow(
                [
                    child.childfirstname + " " + child.childsurname,
                    child.child_phone_number,
                    child.registrationdate,
                ]
            )

        return response

class FamilyDistributionByCitiesReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        children = Children.objects.all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="family_distribution_by_cities_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["City", "Child Name"])
        for child in children:
            writer.writerow(
                [child.city, child.childfirstname + " " + child.childsurname]
            )

        return response

class PotentialTutorshipMatchReportView(View):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        tutors = Tutors.objects.filter(tutorships__isnull=True)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="potential_tutorship_match_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Tutor Name",
                "Tutee Name",
                "Tutor Gender",
                "Tutee Gender",
                "Tutor City",
                "Tutee City",
                "Distance",
            ]
        )
        for tutor in tutors:
            for child in Children.objects.all():
                distance = self.calculate_distance(tutor.city, child.city)
                if distance <= 15:
                    writer.writerow(
                        [
                            tutor.staff.username,
                            child.childfirstname + " " + child.childsurname,
                            tutor.gender,
                            child.gender,
                            tutor.city,
                            child.city,
                            distance,
                        ]
                    )

        return response

    def calculate_distance(self, city1, city2):
        return 10.0

@csrf_exempt  # Disable CSRF (makes things easier)
@api_view(['POST'])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    try:
        user = Staff.objects.get(username=username)
        if user.password == password:  # No hashing, just compare
            request.session.create()  # Create session
            request.session['user_id'] = user.staff_id
            request.session['username'] = user.username
            request.session.set_expiry(86400)  # 1 day expiry

            response = JsonResponse({'message': 'Login successful!'})
            response.set_cookie('sessionid', request.session.session_key, httponly=True, samesite='Lax')
            return response
        else:
            return JsonResponse({'error': 'Invalid password'}, status=400)

    except Staff.DoesNotExist:
        return JsonResponse({'error': 'Invalid username'}, status=400)
    
@api_view(['GET'])
def get_permissions(request):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'detail': 'Authentication credentials were not provided.'}, status=403)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT 
                p.permission_id, 
                p.resource, 
                p.action
            FROM childsmile_app_staff s
            JOIN childsmile_app_role r ON s.role_id = r.id
            JOIN childsmile_app_permissions p ON r.id = p.role_id
            WHERE s.staff_id = %s
        """, [user_id])
        permissions = cursor.fetchall()

    permissions_data = [
        {
            'permission_id': row[0],
            'resource': row[1],
            'action': row[2]
        }
        for row in permissions
    ]
    return JsonResponse({'permissions': permissions_data})