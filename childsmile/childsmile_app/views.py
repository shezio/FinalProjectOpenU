from rest_framework import viewsets
from django.http import HttpResponse
from django.shortcuts import render
from django.views import View
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
    Feedback,
    TutorFeedback,
    VolunteerFeedback,
)
from rest_framework.decorators import action
from rest_framework.response import Response, status
import csv
import datetime


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


class TutorshipViewSet(viewsets.ModelViewSet):
    queryset = Tutorship.objects.all()

    @action(detail=False, methods=["post"])
    def match_tutorship(self, request):
        # Implement logic for matching tutorships based on criteria
        tutor_id = request.data.get("tutor_id")
        family_member_id = request.data.get("family_member_id")

        tutor = Tutor.objects.get(id=tutor_id)
        family_member = FamilyMember.objects.get(member_id=family_member_id)

        # Example criteria checks
        geographic_proximity = self.calculate_geographic_proximity(tutor, family_member)
        gender_match = tutor.gender == family_member.gender

        if geographic_proximity <= 10 and gender_match:  # Example criteria
            tutorship = Tutorship.objects.create(
                tutor=tutor,
                family_member=family_member,
                start_date=request.data.get("start_date"),
                status="Active",
                geographic_proximity=geographic_proximity,
                gender_match=gender_match,
            )
            return Response(
                {
                    "tutorship_id": tutorship.tutorship_id,
                    "tutor_id": tutorship.tutor.id,
                    "family_member_id": tutorship.family_member.member_id,
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

    def calculate_geographic_proximity(self, tutor, family_member):
        # Implement logic to calculate geographic proximity
        # Example: Return a dummy value for now
        return 5.0


class VolunteerViewSet(viewsets.ModelViewSet):
    queryset = Volunteer.objects.all()


class MatureViewSet(viewsets.ModelViewSet):
    queryset = Mature.objects.filter(
        is_active=True, date_of_birth__lte="2008-12-26"
    )  # Adjust the date to ensure age > 16


class HealthyKidViewSet(viewsets.ModelViewSet):
    queryset = HealthyKid.objects.filter(is_active=True)


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()


class TutorFeedbackViewSet(viewsets.ModelViewSet):
    queryset = TutorFeedback.objects.all()


class VolunteerFeedbackViewSet(viewsets.ModelViewSet):
    queryset = VolunteerFeedback.objects.all()


class VolunteerFeedbackReportView(View):
    def get(self, request):
        feedbacks = VolunteerFeedback.objects.all()
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
    def get(self, request):
        tutorships = Tutorship.objects.filter(status="Active")
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
                    tutorship.family_member.first_name
                    + " "
                    + tutorship.family_member.last_name,
                ]
            )

        return response


class FamiliesWaitingForTutorsReportView(View):
    def get(self, request):
        families = Family.objects.filter(members__tutorship__isnull=True).distinct()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="families_waiting_for_tutors_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers"])
        for family in families:
            for member in family.members.all():
                writer.writerow(
                    [member.first_name + " " + member.last_name, family.phone_number]
                )

        return response


class DepartedFamiliesReportView(View):
    def get(self, request):
        families = Family.objects.filter(is_active=False)
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
        for family in families:
            for member in family.members.all():
                writer.writerow(
                    [
                        member.first_name + " " + member.last_name,
                        family.phone_number,
                        family.departure_date,
                        family.responsible_person,
                        family.reason_for_departure,
                    ]
                )

        return response


class NewFamiliesLastMonthReportView(View):
    def get(self, request):
        last_month = datetime.date.today() - datetime.timedelta(days=30)
        families = Family.objects.filter(created_at__gte=last_month)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="new_families_last_month_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers", "Date of Joining"])
        for family in families:
            for member in family.members.all():
                writer.writerow(
                    [
                        member.first_name + " " + member.last_name,
                        family.phone_number,
                        family.created_at,
                    ]
                )

        return response


class FamilyDistributionByCitiesReportView(View):
    def get(self, request):
        families = Family.objects.all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="family_distribution_by_cities_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["City", "Child Name"])
        for family in families:
            for member in family.members.all():
                writer.writerow(
                    [family.city, member.first_name + " " + member.last_name]
                )

        return response


class PotentialTutorshipMatchReportView(View):
    def get(self, request):
        tutors = Tutor.objects.filter(tutorship__isnull=True)
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
            for family_member in FamilyMember.objects.all():
                distance = self.calculate_distance(tutor.city, family_member.city)
                if distance <= 15:
                    writer.writerow(
                        [
                            tutor.staff.username,
                            family_member.first_name + " " + family_member.last_name,
                            tutor.gender,
                            family_member.gender,
                            tutor.city,
                            family_member.city,
                            distance,
                        ]
                    )

        return response

    def calculate_distance(self, city1, city2):
        # Implement logic to calculate distance between cities
        # Example: Return a dummy value for now
        return 10.0
