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
    PrevTutorshipStatuses,  # Add this line
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
@api_view(["POST"])
def calculate_possible_matches(request):
    try:
        # Step 1: Check user permissions
        check_matches_permissions(request, ["CREATE", "UPDATE", "DELETE", "VIEW"])
        # print("DEBUG: User has all required permissions.")

        # Step 2: Fetch possible matches
        possible_matches = fetch_possible_matches()
        #print(f"DEBUG: Fetched {len(possible_matches)} possible matches.")

        # Step 3: Calculate distances and coordinates
        possible_matches = calculate_distances(possible_matches)
        # print("DEBUG: Calculated distances and coordinates for possible matches.")

        # Step 4: Calculate grades
        graded_matches = calculate_grades(possible_matches)
        #print(f"DEBUG: Calculated grades for matches.")

        # # --- PRINT ALL TUTORS INCLUDED IN MATCHES ---
        # tutor_ids = set(match["tutor_id"] for match in graded_matches)
        # tutors = Tutors.objects.filter(id_id__in=tutor_ids).select_related("staff")
        # print("DEBUG: Tutors included in matches:")
        # for t in tutors:
        #     print(
        #         f"staff={t.staff.first_name} {t.staff.last_name}, id={t.id_id}"
        #     )

        # Step 5: Clear the possiblematches table
        # print("DEBUG: Clearing possible matches table.")
        clear_possible_matches()

        # Step 6: Insert new matches
        #print(f"DEBUG: Inserting {len(graded_matches)} new matches into the database.")
        insert_new_matches(graded_matches)

        # print("DEBUG: New matches inserted successfully.")
        # print("DEBUG: Possible matches calculation completed.")

        return JsonResponse(
            {
                "message": "Possible matches calculated successfully.",
                "matches": graded_matches,
            },
            status=200,
        )

    except PermissionError as e:
        print(f"DEBUG: Permission error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=403)

    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def get_tutorships(request):
    """
    Retrieve all tutorships with their full details.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this page."}, status=401
        )

    try:
        tutorships = Tutorships.objects.select_related("child", "tutor__staff").values(
            "id",
            # add child id and tutor id to the response
            "child_id",
            "tutor_id",
            "child__childfirstname",
            "child__childsurname",
            "tutor__staff__staff_id",
            "tutor__staff__first_name",
            "tutor__staff__last_name",
            "created_date",
            "updated_at",
            "approval_counter",
            "last_approver",
        )

        # Prepare the data
        tutorships_data = [
            {
                "id": tutorship["id"],
                "child_id": tutorship["child_id"],
                "tutor_id": tutorship["tutor_id"],
                "child_firstname": tutorship["child__childfirstname"],
                "child_lastname": tutorship["child__childsurname"],
                "tutor_staff_id": tutorship["tutor__staff__staff_id"],
                "tutor_firstname": tutorship["tutor__staff__first_name"],
                "tutor_lastname": tutorship["tutor__staff__last_name"],
                "created_date": tutorship["created_date"].strftime("%d/%m/%Y"),
                "updated_at": tutorship["updated_at"],
                "approval_counter": tutorship["approval_counter"],
                "last_approver": tutorship["last_approver"],
            }
            for tutorship in tutorships
        ]
        return JsonResponse({"tutorships": tutorships_data}, status=200)
    except Exception as e:
        print(f"DEBUG: Error fetching tutorships: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def create_tutorship(request):
    """
    Create a new tutorship record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "CREATE"):
        return JsonResponse(
            {"error": "You do not have permission to create a tutorship."}, status=401
        )

    try:
        data = request.data  # Use request.data for JSON payloads
        print(f"DEBUG: Incoming request data: {data}")  # Log the incoming data

        # Handle nested "match" object
        if "match" in data:
            match_data = data["match"]
            # Merge match data with the root-level fields
            data.update(match_data)

        # Validate required fields
        required_fields = ["child_id", "tutor_id", "staff_role_id"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            print(f"DEBUG: Missing fields: {missing_fields}")  # Log missing fields
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # Retrieve and validate the staff role ID
        staff_role_id = data.get("staff_role_id")
        if not isinstance(staff_role_id, int):
            print(f"DEBUG: Invalid staff_role_id: {staff_role_id}")
            return JsonResponse(
                {"error": "Invalid staff_role_id. It must be an integer."}, status=400
            )

        # Retrieve child and tutor objects
        child = Children.objects.get(child_id=data["child_id"])
        tutor = Tutors.objects.get(id_id=data["tutor_id"])

        # Save current statuses in PrevTutorshipStatuses
        PrevTutorshipStatuses.objects.create(
            tutor_id=tutor,
            child_id=child,
            tutor_tut_status=tutor.tutorship_status,  # or the correct field name
            child_tut_status=child.tutoring_status,   # or the correct field name
        )

        # Create a new tutorship record in the database
        tutorship = Tutorships.objects.create(
            child_id=data["child_id"],
            tutor_id=data["tutor_id"],
            created_date=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            last_approver=[staff_role_id],  # Initialize with the creator's role ID
            approval_counter=1,  # Start with 1 approver
        )

        # After tutorship creation
        child.tutoring_status = "יש_חונך"
        child.save()

        tutor.tutorship_status = "יש_חניך"
        tutor.save()
        
        print(f"DEBUG: Tutorship created successfully with ID {tutorship.id}")
        return JsonResponse(
            {"message": "Tutorship created successfully", "tutorship_id": tutorship.id},
            status=201,
        )
    except KeyError as e:
        print(f"DEBUG: Missing key in request data: {str(e)}")
        return JsonResponse({"error": f"Missing key: {str(e)}"}, status=400)
    except Exception as e:
        print(f"DEBUG: An error occurred while creating a tutorship: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def update_tutorship(request, tutorship_id):
    """
    Update an existing tutorship record.
    """
    print(f"DEBUG: Received request to update tutorship with ID {tutorship_id}")
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "UPDATE"):
        return JsonResponse(
            {"error": "You do not have permission to update this tutorship."},
            status=401,
        )

    data = request.data
    print(f"DEBUG: Incoming request data for update: {data}")  # Log the incoming data
    staff_role_id = data.get("staff_role_id")
    if not staff_role_id:
        return JsonResponse({"error": "Staff role ID is required"}, status=500)

    try:
        tutorship = Tutorships.objects.get(id=tutorship_id)
    except Tutorships.DoesNotExist:
        return JsonResponse({"error": "Tutorship not found"}, status=404)

    if staff_role_id in tutorship.last_approver:
        return JsonResponse(
            {"error": "This role has already approved this tutorship"}, status=400
        )
    try:
        tutorship.last_approver.append(staff_role_id)
        if tutorship.approval_counter <= 2:
            tutorship.approval_counter = len(tutorship.last_approver)
        else:
            raise ValueError("Approval counter cannot exceed 2")
        tutorship.updated_at = datetime.datetime.now()  # Updated to use datetime now()
        tutorship.save()

        # --- Add Tutor role if approval_counter becomes 2 ---
        if tutorship.approval_counter == 2:
            tutor_id = (
                tutorship.tutor_id
            )  # This is the id_id from Tutors (and SignedUp)
            # Find the Tutors record
            tutor = Tutors.objects.filter(id_id=tutor_id).first()
            if tutor:
                staff_member = tutor.staff  # ForeignKey to Staff
                # Check if staff_member already has the Tutor role
                tutor_role = Role.objects.filter(role_name="Tutor").first()
                if tutor_role and tutor_role not in staff_member.roles.all():
                    staff_member.roles.add(tutor_role)
                    staff_member.save()
                    print(f"DEBUG: Added 'Tutor' role to staff {staff_member.username}")

        return JsonResponse(
            {
                "message": "Tutorship updated successfully",
                "approval_counter": tutorship.approval_counter,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the tutorship: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["DELETE"])
def delete_tutorship(request, tutorship_id):
    """
    Delete a tutorship record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "DELETE"):
        return JsonResponse(
            {"error": "You do not have permission to delete this tutorship."},
            status=401,
        )

    try:
        # Fetch the existing tutorship record
        try:
            tutorship = Tutorships.objects.get(id=tutorship_id)
        except Tutorships.DoesNotExist:
            return JsonResponse({"error": "Tutorship not found"}, status=404)

        # Delete the tutorship record
        tutorship.delete()

        print(f"DEBUG: Tutorship with ID {tutorship_id} deleted successfully.")
        return JsonResponse(
            {"message": "Tutorship deleted successfully", "tutorship_id": tutorship_id},
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting the tutorship: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)