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
    Feedback,
    Tutor_Feedback,
    General_V_Feedback,
    Tasks,
    Task_Types,
    PossibleMatches,  # Add this line
    InitialFamilyData,
    PrevTutorshipStatuses,
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
    PossibleMatchesViewSet,
    VolunteerFeedbackReportView,
    TutorToFamilyAssignmentReportView,
    FamiliesWaitingForTutorsReportView,
    DepartedFamiliesReportView,
    NewFamiliesLastMonthReportView,
    PotentialTutorshipMatchReportView,
)
from django.db import DatabaseError
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils.timezone import now
import datetime
import urllib3
from django.utils.timezone import make_aware
from geopy.exc import GeocoderTimedOut
from geopy.geocoders import Nominatim
import threading, time
from time import sleep
from math import sin, cos, sqrt, atan2, radians, ceil
import json
import os
from django.db.models import Count, F
from .utils import *

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@csrf_exempt
@api_view(["PUT"])
def update_general_volunteer(request, volunteer_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "general_volunteer", "UPDATE"):
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        volunteer = General_Volunteer.objects.get(id_id=volunteer_id)
    except General_Volunteer.DoesNotExist:
        return JsonResponse({"error": "General Volunteer not found."}, status=404)

    data = request.data
    volunteer.comments = data.get("comments", volunteer.comments)
    volunteer.save()
    return JsonResponse({"message": "General Volunteer updated successfully."}, status=200)

@csrf_exempt
@api_view(["PUT"])
def update_tutor(request, tutor_id):
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "tutors", "UPDATE"):
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        tutor = Tutors.objects.get(id_id=tutor_id)
    except Tutors.DoesNotExist:
        return JsonResponse({"error": "Tutor not found."}, status=404)

    data = request.data
    updated = False

    # Update tutor_email in both Tutors and Staff tables
    if "tutor_email" in data:
        tutor.tutor_email = data["tutor_email"]
        try:
            staff = Staff.objects.get(staff_id=tutor.staff_id)
            staff.email = data["tutor_email"]
            staff.save()
        except Staff.DoesNotExist:
            pass
        updated = True

    # Only allow updating relationship_status and tutee_wellness if tutor is in tutorship
    if "relationship_status" in data or "tutee_wellness" in data:
        tutorship = Tutorships.objects.filter(tutor_id=tutor_id).first()
        if not tutorship or not tutorship.child:
            # Just warn, do not update these fields
            print("Tutor not in tutorship, cannot update relationship_status or tutee_wellness.")
        else:
            child = tutorship.child
            if "relationship_status" in data:
                tutor.relationship_status = child.marital_status
                updated = True
            if "tutee_wellness" in data:
                tutor.tutee_wellness = child.current_medical_state
                updated = True

    # Update tutorship_status and PrevTutorshipStatuses
    if "tutorship_status" in data:
        tutor.tutorship_status = data["tutorship_status"]
        updated = True
        prev_status = PrevTutorshipStatuses.objects.filter(tutor_id=tutor).order_by('-last_updated').first()
        if prev_status:
            prev_status.tutor_tut_status = data["tutorship_status"]
            prev_status.save()
        else:
            tutorship = Tutorships.objects.filter(tutor_id=tutor_id).first()
            if tutorship and tutorship.child:
                PrevTutorshipStatuses.objects.create(
                    tutor_id=tutor,
                    child_id=tutorship.child,
                    tutor_tut_status=data["tutorship_status"],
                    child_tut_status="",
                )
            # else: do not create history record if no child

    if "preferences" in data:
        tutor.preferences = data["preferences"]
        updated = True

    if updated:
        tutor.save()
        return JsonResponse({"message": "Tutor updated successfully."}, status=200)
    else:
        return JsonResponse({"message": "No fields updated."}, status=200)
