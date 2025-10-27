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
from .audit_utils import log_api_action

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@csrf_exempt
@api_view(["PUT"])
def update_general_volunteer(request, volunteer_id):
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "general_volunteer", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="You do not have permission to access this resource",
            status_code=401,
            entity_type='General_Volunteer',
            entity_ids=[volunteer_id]
        )
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        volunteer = General_Volunteer.objects.get(id_id=volunteer_id)
    except General_Volunteer.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_GENERAL_VOLUNTEER_FAILED',
            success=False,
            error_message="General Volunteer not found",
            status_code=404,
            entity_type='General_Volunteer',
            entity_ids=[volunteer_id]
        )
        return JsonResponse({"error": "General Volunteer not found."}, status=404)

    data = request.data
    old_comments = volunteer.comments
    volunteer.comments = data.get("comments", volunteer.comments)
    volunteer.save()

    log_api_action(
        request=request,
        action='UPDATE_GENERAL_VOLUNTEER_SUCCESS',
        affected_tables=['childsmile_app_general_volunteer'],
        entity_type='General_Volunteer',
        entity_ids=[volunteer_id],
        success=True,
        additional_data={
            'old_comments': old_comments,
            'new_comments': volunteer.comments
        }
    )

    return JsonResponse({"message": "General Volunteer updated successfully."}, status=200)

@csrf_exempt
@api_view(["PUT"])
def update_tutor(request, tutor_id):
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    if not has_permission(request, "tutors", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="You do not have permission to access this resource",
            status_code=401,
            entity_type='Tutor',
            entity_ids=[tutor_id]
        )
        return JsonResponse({"error": "You do not have permission to access this resource."}, status=401)

    try:
        tutor = Tutors.objects.get(id_id=tutor_id)
    except Tutors.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FAILED',
            success=False,
            error_message="Tutor not found",
            status_code=404,
            entity_type='Tutor',
            entity_ids=[tutor_id]
        )
        return JsonResponse({"error": "Tutor not found."}, status=404)

    data = request.data
    updated = False
    
    # Store original values for audit
    original_data = {
        'tutor_email': tutor.tutor_email,
        'relationship_status': tutor.relationship_status,
        'tutee_wellness': tutor.tutee_wellness,
        'tutorship_status': tutor.tutorship_status,
        'preferences': tutor.preferences
    }
    
    affected_tables = ['childsmile_app_tutors']

    # Update tutor_email in both Tutors and Staff tables
    if "tutor_email" in data:
        tutor.tutor_email = data["tutor_email"]
        try:
            staff = Staff.objects.get(staff_id=tutor.staff_id)
            staff.email = data["tutor_email"]
            staff.save()
            affected_tables.append('childsmile_app_staff')
        except Staff.DoesNotExist:
            pass
        updated = True

    # Try to locate existing tutorship (we'll need it later)
    tutorship = Tutorships.objects.filter(tutor_id=tutor_id).first()
    child = tutorship.child if tutorship else None

    # Only allow updating relationship_status and tutee_wellness if tutor is in tutorship
    if ("relationship_status" in data or "tutee_wellness" in data) and tutorship and child:
        if "relationship_status" in data:
            new_status = data["relationship_status"]
            if new_status != tutor.relationship_status:
                tutor.relationship_status = new_status
                child.marital_status = new_status
                child.save()
                affected_tables.append('childsmile_app_children')
                updated = True

        if "tutee_wellness" in data:
            new_wellness = data["tutee_wellness"]
            if new_wellness != tutor.tutee_wellness:
                tutor.tutee_wellness = new_wellness
                child.current_medical_state = new_wellness
                child.save()
                if 'childsmile_app_children' not in affected_tables:
                    affected_tables.append('childsmile_app_children')
                updated = True

    # --- Tutorship status logic + PrevTutorshipStatuses ---
    if "tutorship_status" in data:
        new_tutor_status = data["tutorship_status"]
        if new_tutor_status != tutor.tutorship_status:
            tutor.tutorship_status = new_tutor_status
            updated = True

            # Find existing prev record
            prev = PrevTutorshipStatuses.objects.filter(tutor_id=tutor).order_by('-last_updated').first()

            if prev:
                prev.tutor_tut_status = new_tutor_status
                prev.save()
                affected_tables.append('childsmile_app_prevtutorshipstatuses')
            else:
                PrevTutorshipStatuses.objects.create(
                    tutor_id=tutor,
                    child_id=child if child else None,
                    tutor_tut_status=new_tutor_status,
                    child_tut_status=child.tutorship_status if child else "",
                )
                affected_tables.append('childsmile_app_prevtutorshipstatuses')

    # --- Child status logic (if provided) ---
    if "child_tut_status" in data and child:
        new_child_status = data["child_tut_status"]

        # assuming child has field tutorship_status or equivalent
        if getattr(child, "tutorship_status", "") != new_child_status:
            setattr(child, "tutorship_status", new_child_status)
            child.save()
            if 'childsmile_app_children' not in affected_tables:
                affected_tables.append('childsmile_app_children')
            updated = True

            # update PrevTutorshipStatuses
            prev = PrevTutorshipStatuses.objects.filter(child_id=child).order_by('-last_updated').first()

            if prev:
                prev.child_tut_status = new_child_status
                prev.save()
                if 'childsmile_app_prevtutorshipstatuses' not in affected_tables:
                    affected_tables.append('childsmile_app_prevtutorshipstatuses')
            else:
                PrevTutorshipStatuses.objects.create(
                    tutor_id=tutor,
                    child_id=child,
                    tutor_tut_status=tutor.tutorship_status,
                    child_tut_status=new_child_status,
                )
                if 'childsmile_app_prevtutorshipstatuses' not in affected_tables:
                    affected_tables.append('childsmile_app_prevtutorshipstatuses')

    if "preferences" in data:
        tutor.preferences = data["preferences"]
        updated = True

    if updated:
        tutor.save()
        
        # Determine what changed for audit
        changed_fields = {}
        for field, original_value in original_data.items():
            if field in data:
                new_value = getattr(tutor, field, data[field])
                if original_value != new_value:
                    changed_fields[field] = {
                        'old': original_value,
                        'new': new_value
                    }

        log_api_action(
            request=request,
            action='UPDATE_TUTOR_SUCCESS',
            affected_tables=affected_tables,
            entity_type='Tutor',
            entity_ids=[tutor_id],
            success=True,
            additional_data={
                'changed_fields': changed_fields,
                'has_tutorship': tutorship is not None,
                'child_id': child.child_id if child else None
            }
        )
        
        return JsonResponse({"message": "Tutor updated successfully."}, status=200)
    else:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_SUCCESS',
            entity_type='Tutor',
            entity_ids=[tutor_id],
            success=True,
            additional_data={
                'changed_fields': {},
                'no_updates_made': True
            }
        )
        return JsonResponse({"message": "No fields updated."}, status=200)
