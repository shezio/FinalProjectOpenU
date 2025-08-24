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
@api_view(["GET"])
def get_complete_family_details(request):
    """
    get all the data from children table after checking if the user has permission to view it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "children" resource
    if not has_permission(request, "children", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )
    try:
        families = Children.objects.all()
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
                "responsible_coordinator": family.responsible_coordinator,
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
                "status": family.status,  # Add the status field
                "age": family.age,  # Add the age field
            }
            for family in families
        ]

        # Fetch marital statuses only once
        marital_statuses_data = cache.get("marital_statuses_data")
        if not marital_statuses_data:
            marital_statuses = Children.objects.values_list(
                "marital_status", flat=True
            ).distinct()
            marital_statuses_data = [{"status": status} for status in marital_statuses]
            cache.set("marital_statuses_data", marital_statuses_data, timeout=300)

        # Fetch tutoring statuses only once
        tutoring_statuses_data = cache.get("tutoring_statuses_data")
        if not tutoring_statuses_data:
            tutoring_statuses = Children.objects.values_list(
                "tutoring_status", flat=True
            ).distinct()
            tutoring_statuses_data = [
                {"status": status} for status in tutoring_statuses
            ]
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
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def create_family(request):
    """
    Create a new family in the children table after checking if the user has permission to create it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "children" resource
    if not has_permission(request, "children", "CREATE"):
        return JsonResponse(
            {"error": "You do not have permission to create a family."}, status=401
        )

    try:
        # Extract data from the request
        data = request.data  # Use request.data for JSON payloads

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
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # Create a new family record in the database
        family = Children.objects.create(
            child_id=data["child_id"],  # Assuming child_id is provided in the request
            childfirstname=data["childfirstname"],
            childsurname=data["childsurname"],
            registrationdate=datetime.datetime.now(),
            lastupdateddate=datetime.datetime.now(),
            gender=True if data["gender"] == "נקבה" else False,
            responsible_coordinator=user_id,  # the user who is creating the family - which is a Family Coordinator
            city=data["city"],
            child_phone_number=data["child_phone_number"],
            treating_hospital=data["treating_hospital"],
            date_of_birth=data["date_of_birth"],
            medical_diagnosis=data.get("medical_diagnosis"),  # Optional
            diagnosis_date=(
                data.get("diagnosis_date") if data.get("diagnosis_date") else None
            ),  # Optional
            marital_status=data["marital_status"],
            num_of_siblings=data["num_of_siblings"],
            details_for_tutoring=(
                data["details_for_tutoring"]
                if data.get("details_for_tutoring")
                else "לא_רלוונטי"
            ),
            additional_info=data.get("additional_info"),  # Optional
            tutoring_status=(
                data["tutoring_status"] if data.get("tutoring_status") else "לא_רלוונטי"
            ),
            current_medical_state=data.get("current_medical_state"),  # Optional
            when_completed_treatments=(
                data.get("when_completed_treatments")
                if data.get("when_completed_treatments")
                else None
            ),  # Optional
            father_name=data.get("father_name"),  # Optional
            father_phone=data.get("father_phone"),  # Optional
            mother_name=data.get("mother_name"),  # Optional
            mother_phone=data.get("mother_phone"),  # Optional
            street_and_apartment_number=data.get(
                "street_and_apartment_number"
            ),  # Optional
            expected_end_treatment_by_protocol=(
                data.get("expected_end_treatment_by_protocol")
                if data.get("expected_end_treatment_by_protocol")
                else None
            ),  # Optional
            has_completed_treatments=data.get(
                "has_completed_treatments", False
            ),  # Default to False
            status=(data["status"] if data.get("status") else "טיפולים"),  # Default to "טיפולים"
        )

        return JsonResponse(
            {"message": "Family created successfully", "family_id": family.child_id},
            status=201,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while creating a family: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
@transaction.atomic
def update_family(request, child_id):
    """
    Update an existing family in the children table and propagate changes to related tables.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "children" resource
    if not has_permission(request, "children", "UPDATE"):
        return JsonResponse(
            {"error": "You do not have permission to update this family."}, status=401
        )

    try:
        # Fetch the existing family record
        try:
            family = Children.objects.get(child_id=child_id)
        except Children.DoesNotExist:
            return JsonResponse({"error": "Family not found."}, status=404)

        # Extract data from the request
        data = request.data  # Use request.data for JSON payloads

        # Validate that the child_id in the request matches the existing child_id
        request_child_id = data.get("child_id")
        if request_child_id and str(request_child_id) != str(child_id):
            return JsonResponse(
                {
                    "error": "The child_id in the request does not match the existing child_id."
                },
                status=400,
            )

        # print(f"DEBUG: child_id from request: {request_child_id}")
        # print(f"DEBUG: child_id from URL: {child_id}")
        # print(f"DEBUG: Incoming request data for update: {data}")

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
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # Update fields in the Children table
        # print("DEBUG: Updating childfirstname...")
        family.childfirstname = data.get("childfirstname", family.childfirstname)

        # print("DEBUG: Updating childsurname...")
        family.childsurname = data.get("childsurname", family.childsurname)

        # print("DEBUG: Updating gender...")
        family.gender = True if data.get("gender") == "נקבה" else False

        # print("DEBUG: Updating city...")
        family.city = data.get("city", family.city)

        # print("DEBUG: Updating child_phone_number...")
        family.child_phone_number = data.get(
            "child_phone_number", family.child_phone_number
        )

        # print("DEBUG: Updating treating_hospital...")
        family.treating_hospital = data.get(
            "treating_hospital", family.treating_hospital
        )

        # print("DEBUG: Updating date_of_birth...")
        family.date_of_birth = parse_date_field(
            data.get("date_of_birth"), "date_of_birth"
        )

        # print("DEBUG: Updating medical_diagnosis...")
        family.medical_diagnosis = data.get(
            "medical_diagnosis", family.medical_diagnosis
        )

        # print("DEBUG: Updating diagnosis_date...")
        family.diagnosis_date = parse_date_field(
            data.get("diagnosis_date"), "diagnosis_date"
        )

        # print("DEBUG: Updating marital_status...")
        family.marital_status = data.get("marital_status", family.marital_status)

        # print("DEBUG: Updating num_of_siblings...")
        family.num_of_siblings = data.get("num_of_siblings", family.num_of_siblings)

        # print("DEBUG: Updating details_for_tutoring...")
        family.details_for_tutoring = data.get(
            "details_for_tutoring", family.details_for_tutoring
        )

        # print("DEBUG: Updating additional_info...")
        family.additional_info = data.get("additional_info", family.additional_info)

        # print("DEBUG: Updating tutoring_status...")
        family.tutoring_status = data.get("tutoring_status", family.tutoring_status)

        # print("DEBUG: Updating current_medical_state...")
        family.current_medical_state = data.get(
            "current_medical_state", family.current_medical_state
        )

        # print("DEBUG: Updating when_completed_treatments...")
        family.when_completed_treatments = parse_date_field(
            data.get("when_completed_treatments"), "when_completed_treatments"
        )

        # print("DEBUG: Updating father_name...")
        family.father_name = data.get("father_name", family.father_name)

        # print("DEBUG: Updating father_phone...")
        family.father_phone = data.get("father_phone", family.father_phone)

        # print("DEBUG: Updating mother_name...")
        family.mother_name = data.get("mother_name", family.mother_name)

        # print("DEBUG: Updating mother_phone...")
        family.mother_phone = data.get("mother_phone", family.mother_phone)

        # print("DEBUG: Updating street_and_apartment_number...")
        family.street_and_apartment_number = data.get(
            "street_and_apartment_number", family.street_and_apartment_number
        )

        # print("DEBUG: Updating expected_end_treatment_by_protocol...")
        family.expected_end_treatment_by_protocol = parse_date_field(
            data.get("expected_end_treatment_by_protocol"),
            "expected_end_treatment_by_protocol",
        )

        # print("DEBUG: Updating has_completed_treatments...")
        family.has_completed_treatments = data.get(
            "has_completed_treatments", family.has_completed_treatments
        )

        # print("DEBUG: Updating status...")
        family.status = data.get("status", family.status)

        # print("DEBUG: Updating lastupdateddate...")
        family.lastupdateddate = datetime.datetime.now()

        # Save the updated family record
        try:
            family.save()
            print(f"DEBUG: Family with child_id {child_id} saved successfully.")
        except DatabaseError as db_error:
            print(f"DEBUG: Database error while saving family: {str(db_error)}")
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

        # Propagate changes to related tables
        # Update childsmile_app_tasks
        Tasks.objects.filter(related_child_id=child_id).update(
            updated_at=datetime.datetime.now(),
        )

        print(f"DEBUG: Family with child_id {child_id} updated successfully.")

        return JsonResponse(
            {
                "message": "Family updated successfully",
                "family_id": family.child_id,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the family: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_family(request, child_id):
    """
    Delete a family from the children table after checking if the user has permission to delete it.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "children" resource
    if not has_permission(request, "children", "DELETE"):
        return JsonResponse(
            {"error": "You do not have permission to delete this family."}, status=401
        )

    try:
        # Fetch the existing family record
        try:
            family = Children.objects.get(child_id=child_id)
        except Children.DoesNotExist:
            return JsonResponse({"error": "Family not found."}, status=404)

        # Delete the family record
        family.delete()

        # delete related records in childsmile_app_tasks
        Tasks.objects.filter(related_child_id=child_id).delete()

        print(f"DEBUG: Related tasks for child_id {child_id} deleted.")

        # delete related records in childsmile_app_tutorships
        Tutorships.objects.filter(child_id=child_id).delete()

        print(f"DEBUG: Related tutorship records for child_id {child_id} deleted.")

        print(f"DEBUG: Family with child_id {child_id} deleted successfully.")

        return JsonResponse(
            {"message": "Family deleted successfully", "family_id": child_id},
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting the family: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["GET"])
def get_initial_family_data(request):
    """
    Retrieve all initial family data from the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "view"):
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
        print(
            f"DEBUG: An error occurred while retrieving initial family data: {str(e)}"
        )
        return JsonResponse({"error": str(e)}, status=500)


""" create a new view for the InitialFamilyData model that will create a new row"""


@csrf_exempt
@api_view(["POST"])
def create_initial_family_data(request):
    """
    Create a new initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "create"):
        return JsonResponse(
            {"error": "You do not have permission to create initial family data."},
            status=401,
        )

    try:
        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = ["names", "phones"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
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
            created_at=make_aware(
                datetime.datetime.now()
            ),  # Use make_aware for timezone-aware datetime
            updated_at=make_aware(
                datetime.datetime.now()
            ),  # Use make_aware for timezone-aware datetime
            family_added=False,  # Default to False
        )

        print(
            f"DEBUG: Initial family data created successfully with ID {initial_family_data.initial_family_data_id}"
        )
        return JsonResponse(
            {
                "message": "Initial family data created successfully",
                "initial_family_data_id": initial_family_data.initial_family_data_id,
            },
            status=201,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while creating initial family data: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


""" create a new view for the InitialFamilyData model that will update an existing row by id"""


@csrf_exempt
@api_view(["PUT"])
def update_initial_family_data(request, initial_family_data_id):
    """
    Update an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "update"):
        return JsonResponse(
            {"error": "You do not have permission to update initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )
    except InitialFamilyData.DoesNotExist:
        return JsonResponse({"error": "Initial family data not found."}, status=404)

    data = request.data
    required_fields = ["names", "phones"]
    missing_fields = [
        field for field in required_fields if not data.get(field, "").strip()
    ]
    if missing_fields:
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
        return JsonResponse(
            {"message": "Initial family data updated successfully"}, status=200
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating initial family data: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def mark_initial_family_complete(request, initial_family_data_id):
    """
    Update an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch the user and their roles
    user = Staff.objects.get(staff_id=user_id)
    user_roles = set(user.roles.values_list("role_name", flat=True))
    allowed_roles = {"System Administrator", "Technical Coordinator"}
    if not user_roles.intersection(allowed_roles):
        return JsonResponse(
            {
                "error": "You do not have permission to mark initial family data as complete."
            },
            status=401,
        )

    # Check if the user has UPDATE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "update"):
        return JsonResponse(
            {"error": "You do not have permission to update initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )
    except InitialFamilyData.DoesNotExist:
        return JsonResponse({"error": "Initial family data not found."}, status=404)

    data = request.data

    # Update the fields if they are provided in the request
    initial_family_data.updated_at = make_aware(datetime.datetime.now())
    initial_family_data.family_added = data.get(
        "family_added", initial_family_data.family_added
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
                print(f"DEBUG: Task {task.task_id} marked as completed.")

        return JsonResponse(
            {"message": "Initial family data successfully marked as complete"},
            status=200,
        )
    except Exception as e:
        print(
            f"DEBUG: An error occurred while marking initial family data complete: {str(e)}"
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_initial_family_data(request, initial_family_data_id):
    """
    Delete an existing initial family data record in the InitialFamilyData model.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch the user and their roles
    user = Staff.objects.get(staff_id=user_id)
    user_roles = set(user.roles.values_list("role_name", flat=True))
    allowed_roles = {"System Administrator", "Technical Coordinator"}
    if not user_roles.intersection(allowed_roles):
        return JsonResponse(
            {"error": "You do not have permission to delete initial family data."},
            status=401,
        )

    # Check if the user has DELETE permission on the "initial_family_data" resource
    if not has_initial_family_data_permission(request, "delete"):
        return JsonResponse(
            {"error": "You do not have permission to delete initial family data."},
            status=401,
        )

    try:
        initial_family_data = InitialFamilyData.objects.get(
            initial_family_data_id=initial_family_data_id
        )

        related_tasks = Tasks.objects.filter(
            initial_family_data_id_fk=initial_family_data_id
        )
        if related_tasks.exists():
            for task in related_tasks:
                task.delete()
                print(
                    f"DEBUG: Task {task.task_id} deleted due to initial family data deletion."
                )

        # Delete the initial family data record
        initial_family_data.delete()

        return JsonResponse(
            {"message": "Initial family data deleted successfully"}, status=200
        )
    except InitialFamilyData.DoesNotExist:
        return JsonResponse({"error": "Initial family data not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting initial family data: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)