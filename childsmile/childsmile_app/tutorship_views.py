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
from .audit_utils import log_api_action

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
        log_api_action(
            request=request,
            action='CALCULATE_MATCHES_FAILED',
            success=False,
            error_message=str(e),
            status_code=403
        )
        return JsonResponse({"error": str(e)}, status=403)

    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='CALCULATE_MATCHES_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def get_tutorships(request):
    """
    Retrieve all tutorships with their full details.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='VIEW_TUTORSHIPS_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "VIEW"):
        log_api_action(
            request=request,
            action='VIEW_TUTORSHIPS_FAILED',
            success=False,
            error_message="You do not have permission to view this page",
            status_code=401
        )
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
        log_api_action(
            request=request,
            action='VIEW_TUTORSHIPS_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["POST"])
def create_tutorship(request):
    """
    Create a new tutorship record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "CREATE"):
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message="You do not have permission to create a tutorship",
            status_code=401
        )
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
            log_api_action(
                request=request,
                action='CREATE_TUTORSHIP_FAILED',
                success=False,
                error_message=f"Missing required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            return JsonResponse(
                {"error": f"Missing required fields: {', '.join(missing_fields)}"},
                status=400,
            )

        # Retrieve and validate the staff role ID
        staff_role_id = data.get("staff_role_id")
        if not isinstance(staff_role_id, int):
            print(f"DEBUG: Invalid staff_role_id: {staff_role_id}")
            log_api_action(
                request=request,
                action='CREATE_TUTORSHIP_FAILED',
                success=False,
                error_message="Invalid staff_role_id. It must be an integer",
                status_code=400
            )
            return JsonResponse(
                {"error": "Invalid staff_role_id. It must be an integer."}, status=400
            )

        child_id = data["child_id"]
        tutor_id = data["tutor_id"]

        # NEW: Check if tutorship already exists for this child-tutor pair
        existing_tutorship = Tutorships.objects.filter(
            child_id=child_id, 
            tutor_id=tutor_id
        ).first()
        
        if existing_tutorship:
            log_api_action(
                request=request,
                action='CREATE_TUTORSHIP_FAILED',
                success=False,
                error_message=f"Tutorship already exists for child {child_id} and tutor {tutor_id}",
                status_code=409,  # Conflict status code
                additional_data={
                    'child_id': child_id,
                    'tutor_id': tutor_id,
                    'existing_tutorship_id': existing_tutorship.id
                }
            )
            return JsonResponse(
                {"error": f"Tutorship already exists for this child and tutor combination. Existing tutorship ID: {existing_tutorship.id}"},
                status=409,
            )

        # Retrieve child and tutor objects
        child = Children.objects.get(child_id=child_id)
        tutor = Tutors.objects.get(id_id=tutor_id)

        # Save current statuses in PrevTutorshipStatuses
        prev_status = PrevTutorshipStatuses.objects.create(
            tutor_id=tutor,
            child_id=child,
            tutor_tut_status=tutor.tutorship_status,  # or the correct field name
            child_tut_status=child.tutoring_status,   # or the correct field name
        )

        # Create a new tutorship record in the database
        tutorship = Tutorships.objects.create(
            child_id=child_id,
            tutor_id=tutor_id,
            created_date=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            last_approver=[staff_role_id],  # Initialize with the creator's role ID
            approval_counter=1,  # Start with 1 approver
        )

        # 4. Update the prev_status record to set tutorship FK
        prev_status.tutorship_id = tutorship
        prev_status.save()
        
        # After tutorship creation
        child.tutoring_status = "יש_חונך"
        child.save()

        tutor.tutorship_status = "יש_חניך"
        tutor.save()

        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships', 'childsmile_app_prevtutorshipstatuses', 'childsmile_app_children', 'childsmile_app_tutors'],
            entity_type='Tutorship',
            entity_ids=[tutorship.id],
            success=True,
            additional_data={
                'child_id': child_id,
                'tutor_id': tutor_id,
                'staff_role_id': staff_role_id,
                'approval_counter': 1
            }
        )
        
        print(f"DEBUG: Tutorship created successfully with ID {tutorship.id}")
        return JsonResponse(
            {"message": "Tutorship created successfully", "tutorship_id": tutorship.id},
            status=201,
        )
    except Children.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Child with ID {data.get('child_id')} not found",
            status_code=404
        )
        return JsonResponse({"error": f"Child with ID {data.get('child_id')} not found"}, status=404)
    except Tutors.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Tutor with ID {data.get('tutor_id')} not found",
            status_code=404
        )
        return JsonResponse({"error": f"Tutor with ID {data.get('tutor_id')} not found"}, status=404)
    except KeyError as e:
        print(f"DEBUG: Missing key in request data: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Missing key: {str(e)}",
            status_code=400
        )
        return JsonResponse({"error": f"Missing key: {str(e)}"}, status=400)
    except Exception as e:
        print(f"DEBUG: An error occurred while creating a tutorship: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
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
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="You do not have permission to update this tutorship",
            status_code=401,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update this tutorship."},
            status=401,
        )

    data = request.data
    print(f"DEBUG: Incoming request data for update: {data}")  # Log the incoming data
    staff_role_id = data.get("staff_role_id")
    if not staff_role_id:
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="Staff role ID is required",
            status_code=500,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse({"error": "Staff role ID is required"}, status=500)

    try:
        tutorship = Tutorships.objects.get(id=tutorship_id)
    except Tutorships.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="Tutorship not found",
            status_code=404,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse({"error": "Tutorship not found"}, status=404)

    if staff_role_id in tutorship.last_approver:
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="This role has already approved this tutorship",
            status_code=400,
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            additional_data={'staff_role_id': staff_role_id}
        )
        return JsonResponse(
            {"error": "This role has already approved this tutorship"}, status=400
        )
    try:
        old_approval_counter = tutorship.approval_counter
        tutorship.last_approver.append(staff_role_id)
        if tutorship.approval_counter <= 2:
            tutorship.approval_counter = len(tutorship.last_approver)
        else:
            raise ValueError("Approval counter cannot exceed 2")
        tutorship.updated_at = datetime.datetime.now()  # Updated to use datetime now()
        tutorship.save()

        # --- Add Tutor role if approval_counter becomes 2 ---
        tutor_role_added = False
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
                    tutor_role_added = True
                    print(f"DEBUG: Added 'Tutor' role to staff {staff_member.username}")

        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships'] + (['childsmile_app_staff'] if tutor_role_added else []),
            entity_type='Tutorship',
            entity_ids=[tutorship.id],
            success=True,
            additional_data={
                'old_approval_counter': old_approval_counter,
                'new_approval_counter': tutorship.approval_counter,
                'staff_role_id': staff_role_id,
                'tutor_role_added': tutor_role_added
            }
        )

        return JsonResponse(
            {
                "message": "Tutorship updated successfully",
                "approval_counter": tutorship.approval_counter,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the tutorship: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["DELETE"])
def delete_tutorship(request, tutorship_id):
    """
    Delete a tutorship record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "DELETE"):
        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_FAILED',
            success=False,
            error_message="You do not have permission to delete this tutorship",
            status_code=401,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete this tutorship."},
            status=401,
        )

    try:
        # Fetch the existing tutorship record
        try:
            tutorship = Tutorships.objects.get(id=tutorship_id)
        except Tutorships.DoesNotExist:
            log_api_action(
                request=request,
                action='DELETE_TUTORSHIP_FAILED',
                success=False,
                error_message="Tutorship not found",
                status_code=404,
                entity_type='Tutorship',
                entity_ids=[tutorship_id]
            )
            return JsonResponse({"error": "Tutorship not found"}, status=404)

        tutor = tutorship.tutor
        child = tutorship.child

        # Store data for audit
        child_id = tutorship.child_id
        tutor_id = tutorship.tutor_id

        # Find the PrevTutorshipStatuses record for this tutorship
        prev_status = PrevTutorshipStatuses.objects.filter(
            tutorship_id=tutorship
        ).order_by('-last_updated').first()

        status_restored = False
        if prev_status:
            tutor.tutorship_status = prev_status.tutor_tut_status
            child.tutoring_status = prev_status.child_tut_status
            tutor.save()
            child.save()
            prev_status.delete()
            status_restored = True
        else:
            tutor.tutorship_status = "אין_חניך"
            child.tutoring_status = "אין_חונך"
            tutor.save()
            child.save()
            PrevTutorshipStatuses.objects.create(
                tutor=tutor,
                child=child,
                tutor_tut_status="אין_חניך",
                child_tut_status="אין_חונך",
                tutorship_id=None
            )

        # Delete the tutorship record
        tutorship.delete()

        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships', 'childsmile_app_prevtutorshipstatuses', 'childsmile_app_children', 'childsmile_app_tutors'],
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            success=True,
            additional_data={
                'deleted_child_id': child_id,
                'deleted_tutor_id': tutor_id,
                'status_restored': status_restored
            }
        )

        print(f"DEBUG: Tutorship with ID {tutorship_id} deleted successfully.")
        return JsonResponse(
            {"message": "Tutorship deleted successfully", "tutorship_id": tutorship_id},
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting the tutorship: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse({"error": str(e)}, status=500)