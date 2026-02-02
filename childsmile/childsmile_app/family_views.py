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
import traceback
from django.db.models import Count, F, Q , Prefetch
from .utils import *
from .audit_utils import log_api_action
from .logger import api_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


@conditional_csrf
@api_view(["GET"])
def get_complete_family_details(request):
    api_logger.info("get_complete_family_details called")
    """
    get all the data from children table after checking if the user has permission to view it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='VIEW_FAMILY_DETAILS_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "children" resource
    if not has_permission(request, "children", "VIEW"):
        log_api_action(
            request=request,
            action='VIEW_FAMILY_DETAILS_FAILED',
            success=False,
            error_message="You do not have permission to view this report",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )
    try:
        families = Children.objects.all()
        
        # MULTI-TUTOR SUPPORT: Prefetch all tutorships for efficiency
        # Only 'active' and 'pending_first_approval' exist (no second approval state)
        all_tutorships = Tutorships.objects.filter(
            tutorship_activation__in=['active', 'pending_first_approval']
        ).select_related('tutor__staff', 'tutor__id')
        
        # Build a dict of child_id -> list of tutors
        child_tutors_map = {}
        for tutorship in all_tutorships:
            child_id = tutorship.child_id
            if child_id not in child_tutors_map:
                child_tutors_map[child_id] = []
            if tutorship.tutor and tutorship.tutor.staff:
                child_tutors_map[child_id].append({
                    'tutor_id': tutorship.tutor.id_id,
                    'tutor_name': f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}",
                    'tutor_phone': tutorship.tutor.id.phone if tutorship.tutor.id else None,  # Phone is on SignedUp, not Staff
                    'tutor_email': tutorship.tutor.staff.email,
                    'tutorship_id': tutorship.id,
                    'tutorship_status': tutorship.tutorship_activation,
                })
        
        families_data = [
            {
                "id": family.child_id,
                "first_name": family.childfirstname,
                "last_name": family.childsurname,
                "street_and_apartment_number": family.street_and_apartment_number,
                "city": family.city,
                "address": f"{family.street_and_apartment_number}, {family.city}",
                "registration_date": family.registrationdate.strftime("%d/%m/%Y"),
                "last_updated_date": family.lastupdateddate.strftime("%d/%m/%Y"),
                "gender": family.gender,
                "responsible_coordinator": get_staff_name_by_id(family.responsible_coordinator) or family.responsible_coordinator or "Unknown",
                "responsible_coordinator_id": family.responsible_coordinator if str(family.responsible_coordinator).isdigit() else "",
                "child_phone_number": family.child_phone_number,
                "treating_hospital": family.treating_hospital,
                "date_of_birth": family.date_of_birth.strftime("%d/%m/%Y"),
                "medical_diagnosis": family.medical_diagnosis,
                "diagnosis_date": (
                    family.diagnosis_date.strftime("%d/%m/%Y")
                    if family.diagnosis_date
                    else None
                ),
                "marital_status": family.marital_status,
                "num_of_siblings": family.num_of_siblings,
                "details_for_tutoring": family.details_for_tutoring,
                "additional_info": family.additional_info,
                "tutoring_status": family.tutoring_status,
                "current_medical_state": family.current_medical_state,
                "when_completed_treatments": (
                    family.when_completed_treatments.strftime("%d/%m/%Y")
                    if family.when_completed_treatments
                    else None
                ),
                "father_name": family.father_name if family.father_name else None,
                "father_phone": family.father_phone if family.father_phone else None,
                "mother_name": family.mother_name if family.mother_name else None,
                "mother_phone": family.mother_phone if family.mother_phone else None,
                "expected_end_treatment_by_protocol": (
                    family.expected_end_treatment_by_protocol.strftime("%d/%m/%Y")
                    if family.expected_end_treatment_by_protocol
                    else None
                ),
                "has_completed_treatments": family.has_completed_treatments,
                "status": family.status,
                "age": family.age,
                # MULTI-TUTOR SUPPORT: Add list of tutors
                "tutors": child_tutors_map.get(family.child_id, []),
                "tutors_count": len(child_tutors_map.get(family.child_id, [])),
            }
            for family in families
        ]

        # Fetch marital statuses only once
        marital_statuses_data = cache.get("marital_statuses_data")
        if not marital_statuses_data:
            # Get marital statuses from enum definition (not from actual data)
            marital_statuses = get_enum_values("marital_status")
            marital_statuses_data = [{"status": status} for status in marital_statuses if status]
            cache.set("marital_statuses_data", marital_statuses_data, timeout=300)

        # Fetch tutoring statuses only once
        tutoring_statuses_data = cache.get("tutoring_statuses_data")
        if not tutoring_statuses_data:
            # Get tutoring statuses from enum definition (not from actual data)
            tutoring_statuses = get_enum_values("tutoring_status")
            tutoring_statuses_data = [{"status": status} for status in tutoring_statuses if status]
            cache.set("tutoring_statuses_data", tutoring_statuses_data, timeout=300)

        # Fetch statuses only once
        statuses_data = cache.get("statuses_data")
        if not statuses_data:
            statuses = get_enum_values("status")
            statuses_data = [{"status": status} for status in statuses]
            cache.set("statuses_data", statuses_data, timeout=300)

        return JsonResponse(
            {
                "families": families_data,
                "marital_statuses": marital_statuses_data,
                "tutoring_statuses": tutoring_statuses_data,
                "statuses": statuses_data,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='VIEW_FAMILY_DETAILS_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
@api_view(["POST"])
def create_family(request):
    api_logger.info("create_family called")
    """
    Create a new family in the children table after checking if the user has permission to create it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
            additional_data={'family_name': 'Unknown'}  # **ADD THIS LINE**
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "children" resource
    if not has_permission(request, "children", "CREATE"):
        log_api_action(
            request=request,
            action='CREATE_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to create a family",
            status_code=401,
            additional_data={'family_name': 'Unknown'}  # **ADD THIS LINE**
        )
        return JsonResponse(
            {"error": "You do not have permission to create a family."}, status=401
        )

    try:
        # Extract data from the request
        data = request.data

        # Validate required fields
        required_fields = [
            "child_id",
            "childfirstname",
            "childsurname",
            "gender",
            "city",
            "child_phone_number",
            "treating_hospital",
            "date_of_birth",
            "marital_status",
            "num_of_siblings",
            "details_for_tutoring",
            "marital_status",
            "tutoring_status",
            "street_and_apartment_number",
            "status",
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_FAMILY_FAILED',
                success=False,
                error_message=f"Missing required fields: {', '.join(missing_fields)}",
                status_code=400,
                additional_data={'family_name': f"{data.get('childfirstname', 'Unknown')} {data.get('childsurname', 'Unknown')}"}  # **ADD THIS LINE**
            )
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # if one of the required fields is invalid, return an error response
        if not is_valid_date(data.get("date_of_birth")):
            log_api_action(
                request=request,
                action='CREATE_FAMILY_FAILED',
                success=False,
                error_message="Invalid date of birth",
                status_code=400,
                additional_data={'family_name': f"{data.get('childfirstname', 'Unknown')} {data.get('childsurname', 'Unknown')}"}  # **ADD THIS LINE**
            )
            return JsonResponse(
                {"error": "Invalid date of birth"},
                status=400,
            )
        # Update the validation in create_family:
        if not is_valid_bigint_child_id(data.get("child_id")):
            log_api_action(
                request=request,
                action='CREATE_FAMILY_FAILED',
                success=False,
                error_message="Invalid child_id - must be exactly 9 digits",
                status_code=400,
                additional_data={'family_name': f"{data.get('childfirstname', 'Unknown')} {data.get('childsurname', 'Unknown')}"}  # **ADD THIS LINE**
            )
            return JsonResponse(
                {"error": "Invalid child_id - must be exactly 9 digits"},
                status=400,
            )

        #if "למצוא_חונך" in data.get("tutoring_status", ""):
            # get the name of the responsible coordinator that has the role of 'Tutored Families Coordinator' else get the name of the responsible coordinator with the role of 'Family Coordinator' using not the user_id but getting it from the Staff table
                # Get the correct responsible coordinator based on tutoring status
        tutoring_status = data.get("tutoring_status", "")
        coordinator_staff_id = get_responsible_coordinator_for_family(tutoring_status)
        responsible_coordinator = coordinator_staff_id if coordinator_staff_id else user_id

        # Create a new family record in the database
        family = Children.objects.create(
            child_id=data["child_id"],
            childfirstname=data["childfirstname"],
            childsurname=data["childsurname"],
            registrationdate=datetime.datetime.now(),
            lastupdateddate=datetime.datetime.now(),
            gender=True if data["gender"] == "נקבה" else False,
            responsible_coordinator=responsible_coordinator,
            city=data["city"],
            child_phone_number=data["child_phone_number"],
            treating_hospital=data["treating_hospital"],
            date_of_birth=data["date_of_birth"],
            medical_diagnosis=data.get("medical_diagnosis"),
            diagnosis_date=(
                data.get("diagnosis_date") if data.get("diagnosis_date") else None
            ),
            marital_status=data["marital_status"],
            num_of_siblings=data["num_of_siblings"],
            details_for_tutoring=(
                data["details_for_tutoring"]
                if data.get("details_for_tutoring")
                else "לא_רלוונטי"
            ),
            additional_info=data.get("additional_info"),
            tutoring_status=(
                data["tutoring_status"] if data.get("tutoring_status") else "לא_רלוונטי"
            ),
            current_medical_state=data.get("current_medical_state"),
            when_completed_treatments=(
                data.get("when_completed_treatments")
                if data.get("when_completed_treatments")
                else None
            ),
            father_name=data.get("father_name"),
            father_phone=data.get("father_phone"),
            mother_name=data.get("mother_name"),
            mother_phone=data.get("mother_phone"),
            street_and_apartment_number=data.get("street_and_apartment_number"),
            expected_end_treatment_by_protocol=(
                data.get("expected_end_treatment_by_protocol")
                if data.get("expected_end_treatment_by_protocol")
                else None
            ),
            has_completed_treatments=data.get("has_completed_treatments", False),
            status=(data["status"] if data.get("status") else "טיפולים"),
        )

        # Log successful family creation
        log_api_action(
            request=request,
            action='CREATE_FAMILY_SUCCESS',
            affected_tables=['childsmile_app_children'],
            entity_type='Children',
            entity_ids=[family.child_id],
            success=True,
            additional_data={
                'family_name': f"{data['childfirstname']} {data['childsurname']}",
                'family_city': data['city'],
                'responsible_coordinator': get_staff_name_by_id(responsible_coordinator) or "Unknown"
            }
        )

        return JsonResponse(
            {"message": "Family created successfully", "ID": family.child_id},
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating a family: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={'family_name': f"{data.get('childfirstname', 'Unknown')} {data.get('childsurname', 'Unknown')}" if 'data' in locals() else 'Unknown'}  # **ADD THIS LINE**
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
@transaction.atomic
def update_family(request, child_id):
    """
    Update an existing family in the children table and propagate changes to related tables.
    """
    api_logger.info(f"update_family called for child_id: {child_id}")
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
            additional_data={'family_name': 'Unknown'}  # **ADD THIS LINE**
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "children" resource
    if not has_permission(request, "children", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to update this family",
            status_code=401,
            entity_type='Children',
            entity_ids=[child_id],
            additional_data={'family_name': 'Unknown'}  # **ADD THIS LINE**
        )
        return JsonResponse(
            {"error": "You do not have permission to update this family."}, status=401
        )

    try:
        # Fetch the existing family record
        try:
            family = Children.objects.get(child_id=child_id)
        except Children.DoesNotExist:
            log_api_action(
                request=request,
                action='UPDATE_FAMILY_FAILED',
                success=False,
                error_message="Family not found",
                status_code=404,
                entity_type='Children',
                entity_ids=[child_id],
                additional_data={'family_name': 'Unknown - Family not found'}
            )
            return JsonResponse({"error": "Family not found."}, status=404)

        # Extract data from the request
        data = request.data
        
        # Initialize field_changes early so it's available in all error handlers
        field_changes = []

        # Validate that the child_id in the request matches the existing child_id
        # UNLESS the user is intentionally changing the ID (will be handled by update_child_id endpoint)
        request_child_id = data.get("child_id")
        if request_child_id and str(request_child_id) != str(child_id):
            # Check if this is an intentional ID change
            # If the IDs are different and both are valid 9-digit numbers, allow it
            # (the actual ID change will be handled by the update_child_id endpoint after other fields are saved)
            request_child_id_str = str(request_child_id).strip()
            if not (request_child_id_str.isdigit() and len(request_child_id_str) == 9):
                log_api_action(
                    request=request,
                    action='UPDATE_FAMILY_FAILED',
                    success=False,
                    error_message="The child_id in the request does not match the existing child_id",
                    status_code=400,
                    entity_type='Children',
                    entity_ids=[child_id],
                    additional_data={
                        'family_name': f"{family.childfirstname} {family.childsurname}",
                        'attempted_changes': field_changes,
                        'changes_count': len(field_changes)
                    }
                )
                return JsonResponse(
                    {
                        "error": "The child_id in the request does not match the existing child_id."
                    },
                    status=400,
                )
            # If it's a valid ID format change, allow it to proceed (will be changed later via update_child_id endpoint)

        required_fields = [
            "child_id",
            "childfirstname",
            "childsurname",
            "gender",
            "city",
            "child_phone_number",
            "treating_hospital",
            "date_of_birth",
            "marital_status",
            "num_of_siblings",
            "details_for_tutoring",
            "marital_status",
            "tutoring_status",
            "street_and_apartment_number",
            "status",
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            log_api_action(
                request=request,
                action='UPDATE_FAMILY_FAILED',
                success=False,
                error_message=f"Missing required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type='Children',
                entity_ids=[child_id],
                additional_data={
                    'family_name': f"{family.childfirstname} {family.childsurname}",
                    'attempted_changes': field_changes,
                    'changes_count': len(field_changes)
                }
            )
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # Store original values for audit
        original_name = f"{family.childfirstname} {family.childsurname}"
        
        # Track what fields are being changed - BEFORE updating
        # Check each field for changes and track them
        if family.childfirstname != data.get("childfirstname", family.childfirstname):
            field_changes.append(f"First Name: '{family.childfirstname}' → '{data.get('childfirstname')}'")
        if family.childsurname != data.get("childsurname", family.childsurname):
            field_changes.append(f"Last Name: '{family.childsurname}' → '{data.get('childsurname')}'")
        
        # Handle gender comparison
        new_gender = True if data.get("gender") == "נקבה" else False
        if family.gender != new_gender:
            old_gender = "נקבה" if family.gender else "זכר"
            new_gender_text = "נקבה" if new_gender else "זכר"
            field_changes.append(f"Gender: '{old_gender}' → '{new_gender_text}'")
            
        if family.city != data.get("city", family.city):
            field_changes.append(f"City: '{family.city}' → '{data.get('city')}'")
        if family.child_phone_number != data.get("child_phone_number", family.child_phone_number):
            field_changes.append(f"Phone: '{family.child_phone_number}' → '{data.get('child_phone_number')}'")
        if family.treating_hospital != data.get("treating_hospital", family.treating_hospital):
            field_changes.append(f"Hospital: '{family.treating_hospital}' → '{data.get('treating_hospital')}'")
        if family.medical_diagnosis != data.get("medical_diagnosis", family.medical_diagnosis):
            field_changes.append(f"Medical Diagnosis: '{family.medical_diagnosis}' → '{data.get('medical_diagnosis')}'")
        if family.marital_status != data.get("marital_status", family.marital_status):
            field_changes.append(f"Marital Status: '{family.marital_status}' → '{data.get('marital_status')}'")
        if family.num_of_siblings != data.get("num_of_siblings", family.num_of_siblings):
            field_changes.append(f"Siblings: '{family.num_of_siblings}' → '{data.get('num_of_siblings')}'")
        if family.details_for_tutoring != data.get("details_for_tutoring", family.details_for_tutoring):
            field_changes.append(f"Tutoring Details: '{family.details_for_tutoring}' → '{data.get('details_for_tutoring')}'")
        if family.additional_info != data.get("additional_info", family.additional_info):
            field_changes.append(f"Additional Info: '{family.additional_info}' → '{data.get('additional_info')}'")
        if family.tutoring_status != data.get("tutoring_status", family.tutoring_status):
            field_changes.append(f"Tutoring Status: '{family.tutoring_status}' → '{data.get('tutoring_status')}'")
        if family.current_medical_state != data.get("current_medical_state", family.current_medical_state):
            field_changes.append(f"Medical State: '{family.current_medical_state}' → '{data.get('current_medical_state')}'")
        if family.father_name != data.get("father_name", family.father_name):
            field_changes.append(f"Father Name: '{family.father_name}' → '{data.get('father_name')}'")
        if family.father_phone != data.get("father_phone", family.father_phone):
            field_changes.append(f"Father Phone: '{family.father_phone}' → '{data.get('father_phone')}'")
        if family.mother_name != data.get("mother_name", family.mother_name):
            field_changes.append(f"Mother Name: '{family.mother_name}' → '{data.get('mother_name')}'")
        if family.mother_phone != data.get("mother_phone", family.mother_phone):
            field_changes.append(f"Mother Phone: '{family.mother_phone}' → '{data.get('mother_phone')}'")
        if family.street_and_apartment_number != data.get("street_and_apartment_number", family.street_and_apartment_number):
            field_changes.append(f"Address: '{family.street_and_apartment_number}' → '{data.get('street_and_apartment_number')}'")
        if family.has_completed_treatments != data.get("has_completed_treatments", family.has_completed_treatments):
            field_changes.append(f"Completed Treatments: '{family.has_completed_treatments}' → '{data.get('has_completed_treatments')}'")
        if family.status != data.get("status", family.status):
            field_changes.append(f"Status: '{family.status}' → '{data.get('status')}'")

        # Handle date fields separately (compare parsed dates)
        new_date_of_birth = parse_date_field(data.get("date_of_birth"), "date_of_birth")
        if family.date_of_birth != new_date_of_birth:
            field_changes.append(f"Birth Date: '{family.date_of_birth}' → '{new_date_of_birth}'")
        
        new_registration_date = parse_date_field(data.get("registration_date"), "registration_date")
        if family.registrationdate != new_registration_date:
            field_changes.append(f"Registration Date: '{family.registrationdate}' → '{new_registration_date}'")
            
        new_diagnosis_date = parse_date_field(data.get("diagnosis_date"), "diagnosis_date")
        if family.diagnosis_date != new_diagnosis_date:
            field_changes.append(f"Diagnosis Date: '{family.diagnosis_date}' → '{new_diagnosis_date}'")
            
        new_treatment_end = parse_date_field(data.get("when_completed_treatments"), "when_completed_treatments")
        if family.when_completed_treatments != new_treatment_end:
            field_changes.append(f"Treatment End: '{family.when_completed_treatments}' → '{new_treatment_end}'")
            
        new_expected_end = parse_date_field(data.get("expected_end_treatment_by_protocol"), "expected_end_treatment_by_protocol")
        if family.expected_end_treatment_by_protocol != new_expected_end:
            field_changes.append(f"Expected End: '{family.expected_end_treatment_by_protocol}' → '{new_expected_end}'")

        # **KEEP ALL EXISTING FIELD UPDATES AS THEY ARE** - Update fields in the Children table
        family.childfirstname = data.get("childfirstname", family.childfirstname)
        family.childsurname = data.get("childsurname", family.childsurname)
        family.gender = True if data.get("gender") == "נקבה" else False
        family.city = data.get("city", family.city)
        family.child_phone_number = data.get("child_phone_number", family.child_phone_number)
        family.treating_hospital = data.get("treating_hospital", family.treating_hospital)
        family.date_of_birth = parse_date_field(data.get("date_of_birth"), "date_of_birth")
        family.registrationdate = parse_date_field(data.get("registration_date"), "registration_date") or family.registrationdate
        family.medical_diagnosis = data.get("medical_diagnosis", family.medical_diagnosis)
        family.diagnosis_date = parse_date_field(data.get("diagnosis_date"), "diagnosis_date")
        family.marital_status = data.get("marital_status", family.marital_status)
        family.num_of_siblings = data.get("num_of_siblings", family.num_of_siblings)
        family.details_for_tutoring = data.get("details_for_tutoring", family.details_for_tutoring)
        family.additional_info = data.get("additional_info", family.additional_info)
        
        # Handle tutoring_status change and auto-update coordinator
        old_tutoring_status = family.tutoring_status
        new_tutoring_status = data.get("tutoring_status", family.tutoring_status)
        family.tutoring_status = new_tutoring_status
        
        # Auto-update responsible_coordinator if tutoring_status changed
        # Only auto-update if coordinator wasn't manually set in the request
        if old_tutoring_status != new_tutoring_status and "responsible_coordinator" not in data:
            new_coordinator_id = get_responsible_coordinator_for_family(new_tutoring_status)
            if new_coordinator_id:
                old_coordinator_name = get_staff_name_by_id(family.responsible_coordinator)
                family.responsible_coordinator = new_coordinator_id
                new_coordinator_name = get_staff_name_by_id(new_coordinator_id)
                field_changes.append(f"Responsible Coordinator (auto-updated): '{old_coordinator_name}' → '{new_coordinator_name}' (due to tutoring status change)")
        elif "responsible_coordinator" in data:
            # Allow manual override of responsible_coordinator
            new_coordinator = data.get("responsible_coordinator")
            if family.responsible_coordinator != new_coordinator:
                old_coordinator_name = get_staff_name_by_id(family.responsible_coordinator)
                family.responsible_coordinator = new_coordinator
                new_coordinator_name = get_staff_name_by_id(new_coordinator)
                field_changes.append(f"Responsible Coordinator (manual): '{old_coordinator_name}' → '{new_coordinator_name}'")
        
        family.current_medical_state = data.get("current_medical_state", family.current_medical_state)
        family.when_completed_treatments = parse_date_field(data.get("when_completed_treatments"), "when_completed_treatments")
        family.father_name = data.get("father_name", family.father_name)
        family.father_phone = data.get("father_phone", family.father_phone)
        family.mother_name = data.get("mother_name", family.mother_name)
        family.mother_phone = data.get("mother_phone", family.mother_phone)
        family.street_and_apartment_number = data.get("street_and_apartment_number", family.street_and_apartment_number)
        family.expected_end_treatment_by_protocol = parse_date_field(data.get("expected_end_treatment_by_protocol"), "expected_end_treatment_by_protocol")
        family.has_completed_treatments = data.get("has_completed_treatments", family.has_completed_treatments)
        
        # Track old status for deceased handling
        old_status = family.status
        new_status = data.get("status", family.status)
        family.status = new_status
        family.lastupdateddate = datetime.datetime.now()
        
        # DECEASED/HEALTHY HANDLING: When child status changes to deceased or healthy, 
        # DELETE all tutorships (not make inactive - that's for inactive staff flow only)
        deceased_statuses = ['ז״ל']  # Only the correct enum value with Hebrew gershayim
        exit_statuses = deceased_statuses + ['בריא']  # Include healthy
        tutors_freed = []
        if new_status in exit_statuses and old_status not in exit_statuses:
            # Child is deceased or healthy - DELETE tutorships and free tutors
            active_tutorships = Tutorships.objects.filter(
                child_id=child_id,
                tutorship_activation__in=['active', 'pending_first_approval']
            )
            for tutorship in active_tutorships:
                tutor = tutorship.tutor
                if tutor:
                    # Mark tutor as available
                    tutor.tutorship_status = 'אין_חניך'
                    tutor.save()
                    tutors_freed.append({
                        'tutor_id': tutor.id_id,
                        'tutor_name': f"{tutor.staff.first_name} {tutor.staff.last_name}" if tutor.staff else 'Unknown'
                    })
                # DELETE the tutorship (not inactive - that's for staff deactivation only)
                tutorship.delete()
            
            # Also clean up PrevTutorshipStatuses for this child
            PrevTutorshipStatuses.objects.filter(child_id=child_id).delete()
            
            if tutors_freed:
                status_reason = "deceased" if new_status in deceased_statuses else "healthy"
                field_changes.append(f"Tutors freed due to {status_reason} status: {[t['tutor_name'] for t in tutors_freed]}")
                api_logger.info(f"Child {child_id} status changed to {status_reason}. Freed {len(tutors_freed)} tutors: {tutors_freed}")
        
        # Save the updated family record
        try:
            family.save()
            api_logger.debug(f"Family with child_id {child_id} saved successfully.")
        except DatabaseError as db_error:
            api_logger.error(f"Database error while saving family: {str(db_error)}")
            log_api_action(
                request=request,
                action='UPDATE_FAMILY_FAILED',
                success=False,
                error_message=f"Database error: {str(db_error)}",
                status_code=500,
                entity_type='Children',
                entity_ids=[child_id],
                additional_data={
                    'family_name': f"{family.childfirstname} {family.childsurname}",
                    'attempted_changes': field_changes,  # **ADD THIS**
                    'changes_count': len(field_changes)  # **ADD THIS**
                }
            )
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

        # Propagate changes to related tables
        Tasks.objects.filter(related_child_id=child_id).update(
            updated_at=datetime.datetime.now(),
        )

        # Update tutor's tutee_wellness and relationship_status if tutorship exists
        # MULTI-TUTOR SUPPORT: Update ALL tutors for this child
        # Only 'active' and 'pending_first_approval' exist (no second approval state)
        tutorships = Tutorships.objects.filter(
            child_id=child_id,
            tutorship_activation__in=['active', 'pending_first_approval']
        )
        for tutorship in tutorships:
            if tutorship.tutor_id:
                Tutors.objects.filter(id_id=tutorship.tutor_id).update(
                    tutee_wellness=family.current_medical_state,
                    relationship_status=family.marital_status
                )

        # Log successful family update
        affected_tables_list = ['childsmile_app_children', 'childsmile_app_tasks', 'childsmile_app_tutors']
        if tutors_freed:
            affected_tables_list.append('childsmile_app_tutorships')
        
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_SUCCESS',
            affected_tables=affected_tables_list,
            entity_type='Children',
            entity_ids=[family.child_id],
            success=True,
            additional_data={
                'updated_family_name': f"{family.childfirstname} {family.childsurname}",
                'original_family_name': original_name,
                'family_city': family.city,
                'family_status': family.status,
                'field_changes': field_changes,  # **ADD THIS**
                'changes_count': len(field_changes),  # **ADD THIS**
                'tutors_freed': tutors_freed if tutors_freed else None
            }
        )

        api_logger.debug(f"Family with child_id {child_id} updated successfully.")

        return JsonResponse(
            {
                "message": "Family updated successfully",
                "ID": family.child_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while updating the family: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Children',
            entity_ids=[child_id],
            additional_data={
                'family_name': f"{family.childfirstname} {family.childsurname}" if 'family' in locals() else 'Unknown',
                'attempted_changes': field_changes if 'field_changes' in locals() else [],  # **ADD THIS**
                'changes_count': len(field_changes) if 'field_changes' in locals() else 0  # **ADD THIS**
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_family(request, child_id):
    api_logger.info(f"delete_family called for child_id: {child_id}")
    """
    Delete a family from the children table after checking if the user has permission to delete it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "children" resource
    if not has_permission(request, "children", "DELETE"):
        log_api_action(
            request=request,
            action='DELETE_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to delete this family",
            status_code=401,
            entity_type='Children',
            entity_ids=[child_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete this family."}, status=401
        )

    try:
        # Fetch the existing family record
        try:
            family = Children.objects.get(child_id=child_id)
            family_name = f"{family.childfirstname} {family.childsurname}"
        except Children.DoesNotExist:
            log_api_action(
                request=request,
                action='DELETE_FAMILY_FAILED',
                success=False,
                error_message="Family not found",
                status_code=404,
                entity_type='Children',
                entity_ids=[child_id],
                additional_data={'family_name': 'Unknown - Family not found'}  # **ADD THIS**
            )
            return JsonResponse({"error": "Family not found."}, status=404)

        # Delete the family record
        family.delete()

        # delete related records in childsmile_app_tasks
        Tasks.objects.filter(related_child_id=child_id).delete()
        api_logger.debug(f"Related tasks for child_id {child_id} deleted.")

        # delete related records in childsmile_app_tutorships
        Tutorships.objects.filter(child_id=child_id).delete()
        api_logger.debug(f"Related tutorship records for child_id {child_id} deleted.")

        # Log successful family deletion
        log_api_action(
            request=request,
            action='DELETE_FAMILY_SUCCESS',
            affected_tables=['childsmile_app_children', 'childsmile_app_tasks', 'childsmile_app_tutorships'],
            entity_type='Children',
            entity_ids=[child_id],
            success=True,
            additional_data={
                'deleted_family_name': family_name,
                'family_first_name': family.childfirstname,  # **ADD THIS**
                'family_last_name': family.childsurname,  # **ADD THIS**
                'family_city': family.city,  # **ADD THIS**
                'family_status': family.status,  # **ADD THIS**
                'family_phone': family.child_phone_number,  # **ADD THIS**
                'family_hospital': family.treating_hospital,  # **ADD THIS**
                'family_marital_status': family.marital_status,  # **ADD THIS**
                'family_tutoring_status': family.tutoring_status,  # **ADD THIS**
                'date_of_birth': family.date_of_birth.strftime("%d/%m/%Y") if family.date_of_birth else None,  # **ADD THIS**
                'medical_diagnosis': family.medical_diagnosis,  # **ADD THIS**
                'current_medical_state': family.current_medical_state  # **ADD THIS**
            }
        )
        return JsonResponse(
            {"message": "Family deleted successfully", "ID": child_id},
            status=200,
        )

    except Exception as e:
        api_logger.error(f"An error occurred while deleting the family: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Children',
            entity_ids=[child_id],
            additional_data={
                'deleted_family_name': family_name if 'family' in locals() else 'Unknown',  # **ADD THIS**
                'family_first_name': family.childfirstname if 'family' in locals() else 'Unknown',  # **ADD THIS**
                'family_last_name': family.childsurname if 'family' in locals() else 'Unknown',  # **ADD THIS**
                'family_city': family.city if 'family' in locals() else 'Unknown',  # **ADD THIS**
                'family_status': family.status if 'family' in locals() else 'Unknown'  # **ADD THIS**
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_initial_family_data(request):
    api_logger.info("get_initial_family_data called")
    """
    Retrieve all initial family data from the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='VIEW_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "view"):
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='VIEW_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to view this data",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to view this data."}, status=401
        )
    try:
        initial_family_data = InitialFamilyData.objects.all()
        data = [
            {
                "initial_family_data_id": item.initial_family_data_id,
                "names": item.names,
                "phones": item.phones,
                "other_information": item.other_information,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
                "family_added": item.family_added,
            }
            for item in initial_family_data
        ]
        return JsonResponse({"initial_family_data": data}, status=200)
    except Exception as e:
        api_logger.error(
            f"An error occurred while retrieving initial family data: {str(e)}"
        )
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='VIEW_INITIAL_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


""" create a new view for the InitialFamilyData model that will create a new row"""


@conditional_csrf
@api_view(["POST"])
def create_initial_family_data(request):
    api_logger.info("create_initial_family_data called")
    """
    Create a new initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='CREATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "create"):
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='CREATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to create initial family data",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to create initial family data."},
            status=401,
        )

    try:
        data = request.data

        # Validate required fields
        required_fields = ["names", "phones"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            # ❌ MISSING AUDIT LOG
            log_api_action(
                request=request,
                action='CREATE_INITIAL_FAMILY_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )
        
        # Create a new initial family data record in the database
        initial_family_data = InitialFamilyData.objects.create(
            names=data["names"],
            phones=data["phones"],
            other_information=(
                data.get("other_information") if data.get("other_information") else None
            ),
            created_at=make_aware(datetime.datetime.now()),
            updated_at=make_aware(datetime.datetime.now()),
            family_added=False,  # Default to False
        )

        api_logger.debug(
            f"Initial family data created successfully with ID {initial_family_data.initial_family_data_id}"
        )
        
        # ❌ MISSING SUCCESS AUDIT LOG
        log_api_action(
            request=request,
            action='CREATE_INITIAL_FAMILY_SUCCESS',
            affected_tables=['childsmile_app_initialfamilydata'],
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data.initial_family_data_id],
            success=True,
            additional_data={
                'family_names': data["names"],
                'family_phones': data["phones"]
            }
        )
        
        return JsonResponse(
            {
                "message": "Initial family data created successfully",
                "initial_family_data_id": initial_family_data.initial_family_data_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating initial family data: {str(e)}")
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='CREATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


""" create a new view for the InitialFamilyData model that will update an existing row by id"""


@conditional_csrf
@api_view(["PUT"])
def update_initial_family_data(request, initial_family_data_id):
    api_logger.info(f"update_initial_family_data called for initial_family_data_id: {initial_family_data_id}")
    """
    Update an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "update"):
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to update initial family data",
            status_code=401,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )
    except InitialFamilyData.DoesNotExist:
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Initial family data not found",
            status_code=404,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse({"error": "Initial family data not found."}, status=404)

    data = request.data
    required_fields = ["names", "phones"]
    missing_fields = [
        field for field in required_fields if not data.get(field, "").strip()
    ]
    if missing_fields:
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
            status_code=400,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {"error": f"Missing or empty required fields: {', '.join(missing_fields)}"},
            status=400,
        )

    # Update the fields if they are provided in the request
    initial_family_data.names = data.get("names", initial_family_data.names)
    initial_family_data.phones = data.get("phones", initial_family_data.phones)
    initial_family_data.other_information = data.get(
        "other_information", initial_family_data.other_information
    )
    initial_family_data.updated_at = make_aware(datetime.datetime.now())
    initial_family_data.family_added = data.get(
        "family_added", initial_family_data.family_added
    )

    # Save the updated record
    try:
        initial_family_data.save()
        
        # ❌ MISSING SUCCESS AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_SUCCESS',
            affected_tables=['childsmile_app_initialfamilydata'],
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            success=True,
            additional_data={
                'updated_family_names': initial_family_data.names,
                'family_added_status': initial_family_data.family_added
            }
        )
        
        return JsonResponse(
            {"message": "Initial family data updated successfully"}, status=200
        )
    except Exception as e:
        api_logger.error(f"An error occurred while updating initial family data: {str(e)}")
        # ❌ MISSING AUDIT LOG
        log_api_action(
            request=request,
            action='UPDATE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def mark_initial_family_complete(request, initial_family_data_id):
    api_logger.info(f"mark_initial_family_complete called for initial_family_data_id: {initial_family_data_id}")
    """
    Update an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch the user and their roles
    user = Staff.objects.get(staff_id=user_id)
    user_roles = set(user.roles.values_list("role_name", flat=True))
    allowed_roles = {"System Administrator", "Technical Coordinator"}
    if not user_roles.intersection(allowed_roles):
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message="You do not have permission to mark initial family data as complete",
            status_code=401,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {
                "error": "You do not have permission to mark initial family data as complete."
            },
            status=401,
        )

    # Check if the user has UPDATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "update"):
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message="You do not have permission to update initial family data",
            status_code=401,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )
    except InitialFamilyData.DoesNotExist:
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message="Initial family data not found",
            status_code=404,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            additional_data={
                'family_names': 'Unknown - Not Found',  # **ADD THIS**
                'family_phones': 'Unknown - Not Found'  # **ADD THIS**
            }
        )
        return JsonResponse({"error": "Initial family data not found."}, status=404)

    data = request.data

    # Update the fields if they are provided in the request
    initial_family_data.updated_at = make_aware(datetime.datetime.now())
    initial_family_data.family_added = data.get(
        "family_added", initial_family_data.family_added
    )

    if initial_family_data.family_added:
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message="Initial family data is already marked as complete",
            status_code=400,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            additional_data={
                'family_names': initial_family_data.names,  # **ADD THIS**
                'family_phones': initial_family_data.phones  # **ADD THIS**
            }
        )
        return JsonResponse(
            {"error": "Initial family data is already marked as complete."},
            status=400,
        )
    
    # Save the updated record
    try:
        initial_family_data.save()

        related_tasks = Tasks.objects.filter(
            initial_family_data_id_fk=initial_family_data_id
        )
        if related_tasks.exists():
            for task in related_tasks:
                task.status = "הושלמה"
                task.save()
                api_logger.debug(f"Task {task.task_id} marked as completed.")

        # Log successful mark as complete
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_SUCCESS',
            affected_tables=['childsmile_app_initialfamilydata', 'childsmile_app_tasks'],
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            success=True,
            additional_data={
                'family_names': initial_family_data.names,  # **ADD THIS**
                'family_phones': initial_family_data.phones,  # **ADD THIS**
                'family_added_status': initial_family_data.family_added
            }
        )

        return JsonResponse(
            {"message": "Initial family data successfully marked as complete"},
            status=200,
        )
    except Exception as e:
        api_logger.error(
            f"An error occurred while marking initial family data complete: {str(e)}"
        )
        log_api_action(
            request=request,
            action='MARK_FAMILY_ADDED_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            additional_data={
                'family_names': initial_family_data.names if 'initial_family_data' in locals() else 'Unknown - Error',  # **ADD THIS**
                'family_phones': initial_family_data.phones if 'initial_family_data' in locals() else 'Unknown - Error'  # **ADD THIS**
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_initial_family_data(request, initial_family_data_id):
    api_logger.info(f"delete_initial_family_data called for initial_family_data_id: {initial_family_data_id}")
    """
    Delete an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch the user and their roles
    user = Staff.objects.get(staff_id=user_id)
    user_roles = set(user.roles.values_list("role_name", flat=True))
    allowed_roles = {"System Administrator", "Technical Coordinator"}
    if not user_roles.intersection(allowed_roles):
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to delete initial family data",
            status_code=401,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete initial family data."},
            status=401,
        )

    # Check if the user has DELETE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "delete"):
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to delete initial family data",
            status_code=401,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )
        
        # Store names and phones for audit BEFORE deletion
        family_names = initial_family_data.names
        family_phones = initial_family_data.phones

        related_tasks = Tasks.objects.filter(
            initial_family_data_id_fk=initial_family_data_id
        )
        if related_tasks.exists():
            for task in related_tasks:
                task.delete()
                api_logger.debug(
                    f"Task {task.task_id} deleted due to initial family data deletion."
                )

        # Delete the initial family data record
        initial_family_data.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_SUCCESS',
            affected_tables=['childsmile_app_initialfamilydata', 'childsmile_app_tasks'],
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            success=True,
            additional_data={
                'deleted_family_names': family_names,  # **ADD THIS**
                'deleted_family_phones': family_phones  # **ADD THIS**
            }
        )

        return JsonResponse(
            {"message": "Initial family data deleted successfully"}, status=200
        )
    except InitialFamilyData.DoesNotExist:
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message="Initial family data not found",
            status_code=404,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            additional_data={
                'deleted_family_names': 'Unknown - Not Found',  # **ADD THIS**
                'deleted_family_phones': 'Unknown - Not Found'  # **ADD THIS**
            }
        )
        return JsonResponse({"error": "Initial family data not found."}, status=404)
    except Exception as e:
        api_logger.error(f"An error occurred while deleting initial family data: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_INITIAL_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='InitialFamilyData',
            entity_ids=[initial_family_data_id],
            additional_data={
                'deleted_family_names': 'Unknown - Error',  # **ADD THIS**
                'deleted_family_phones': 'Unknown - Error'  # **ADD THIS**
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def update_child_id(request, old_id):
    """
    Update a child's ID (Israeli ID) across all related tables.
    This performs a cascading update of the ID in Children table and all FK references.
    """
    api_logger.info(f"update_child_id called for old_id: {old_id}")
    
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
            entity_type='Children',
            entity_ids=[old_id]
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)
    
    # Check permission for children table updates
    if not has_permission(request, "children", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message="You do not have permission to update child IDs",
            status_code=401,
            entity_type='Children',
            entity_ids=[old_id]
        )
        return JsonResponse({"error": "You do not have permission to update child IDs."}, status=401)

    data = request.data
    new_id = data.get("new_id")
    
    if not new_id:
        return JsonResponse({"error": "New ID is required."}, status=400)
    
    # Validate new ID format (9 digits for Israeli ID)
    new_id_str = str(new_id).strip()
    if not new_id_str.isdigit() or len(new_id_str) != 9:
        return JsonResponse({"error": "Invalid ID format. Israeli ID must be exactly 9 digits."}, status=400)
    
    new_id = int(new_id_str)
    
    # Check if new ID already exists
    if Children.objects.filter(child_id=new_id).exists():
        return JsonResponse({"error": "This child ID already exists in the system."}, status=400)
    
    try:
        child = Children.objects.get(child_id=old_id)
    except Children.DoesNotExist:
        return JsonResponse({"error": "Child/Family not found."}, status=404)
    
    try:
        with transaction.atomic():
            # Store original data for audit log
            original_data = {
                'child_name': f"{child.childfirstname} {child.childsurname}",
                'city': child.city,
                'status': child.status
            }
            
            affected_tables = ['childsmile_app_children']
            
            # IMPORTANT: Update tables in correct order - child tables before parent tables
            # to avoid FK constraint violations
            
            # 1. Update PrevTutorshipStatuses FK (references Children via child_id)
            prev_status_updated = PrevTutorshipStatuses.objects.filter(child_id=old_id).update(child_id=new_id)
            if prev_status_updated:
                affected_tables.append('childsmile_app_prevtutorshipstatuses')
                api_logger.debug(f"Updated {prev_status_updated} PrevTutorshipStatuses records")
            
            # 2. Update Tutorships FK (references Children via child)
            tutorship_updated = Tutorships.objects.filter(child_id=old_id).update(child_id=new_id)
            if tutorship_updated:
                affected_tables.append('childsmile_app_tutorships')
                api_logger.debug(f"Updated {tutorship_updated} Tutorships records")
            
            # 3. Update Tasks related_child FK (references Children)
            tasks_updated = Tasks.objects.filter(related_child_id=old_id).update(related_child_id=new_id)
            if tasks_updated:
                affected_tables.append('childsmile_app_tasks')
                api_logger.debug(f"Updated {tasks_updated} Tasks records")
            
            # 4. Finally update Children record - change the primary key
            # Delete the old record and create a new one with new ID
            # Store all fields from old record
            child_data = {
                'child_id': new_id,
                'childfirstname': child.childfirstname,
                'childsurname': child.childsurname,
                'registrationdate': child.registrationdate,
                'lastupdateddate': datetime.datetime.now().date(),
                'gender': child.gender,
                'responsible_coordinator': child.responsible_coordinator,
                'city': child.city,
                'child_phone_number': child.child_phone_number,
                'treating_hospital': child.treating_hospital,
                'date_of_birth': child.date_of_birth,
                'medical_diagnosis': child.medical_diagnosis,
                'diagnosis_date': child.diagnosis_date,
                'marital_status': child.marital_status,
                'num_of_siblings': child.num_of_siblings,
                'details_for_tutoring': child.details_for_tutoring,
                'additional_info': child.additional_info,
                'tutoring_status': child.tutoring_status,
                'current_medical_state': child.current_medical_state,
                'when_completed_treatments': child.when_completed_treatments,
                'father_name': child.father_name,
                'father_phone': child.father_phone,
                'mother_name': child.mother_name,
                'mother_phone': child.mother_phone,
                'street_and_apartment_number': child.street_and_apartment_number,
                'expected_end_treatment_by_protocol': child.expected_end_treatment_by_protocol,
                'has_completed_treatments': child.has_completed_treatments,
                'status': child.status,
                'last_review_talk_conducted': child.last_review_talk_conducted,
            }
            
            # Delete the old record
            child.delete()
            
            # Create new record with new ID
            new_child = Children.objects.create(**child_data)
            api_logger.debug(f"Created new Children record with new_id: {new_id}")
            
            # Log successful ID update
            log_api_action(
                request=request,
                action='UPDATE_FAMILY_SUCCESS',
                affected_tables=affected_tables,
                entity_type='Children',
                entity_ids=[old_id, new_id],
                success=True,
                additional_data={
                    'update_type': 'CHILD_ID_CHANGE',
                    'old_id': old_id,
                    'new_id': new_id,
                    'child_name': original_data['child_name'],
                    'child_city': original_data['city'],
                    'child_status': original_data['status'],
                    'tutorships_updated': tutorship_updated,
                    'tasks_updated': tasks_updated,
                    'prev_statuses_updated': prev_status_updated
                }
            )
            
            return JsonResponse({
                "message": "Child ID updated successfully across all related tables.",
                "old_id": old_id,
                "new_id": new_id,
                "affected_tables": affected_tables,
                "summary": {
                    "tutorships_updated": tutorship_updated,
                    "tasks_updated": tasks_updated,
                    "prev_statuses_updated": prev_status_updated
                }
            }, status=200)
            
    except Exception as e:
        api_logger.error(f"Error updating child ID: {str(e)}\n{traceback.format_exc()}")
        log_api_action(
            request=request,
            action='UPDATE_FAMILY_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Children',
            entity_ids=[old_id],
            additional_data={'attempted_new_id': new_id}
        )
        return JsonResponse({"error": f"Error updating child ID: {str(e)}"}, status=500)