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
from django.db.models import Count, F, Q , Prefetch
from .utils import *
from .audit_utils import log_api_action
from .logger import api_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


@conditional_csrf
@api_view(["POST"])
def calculate_possible_matches(request):
    api_logger.info("calculate_possible_matches called")
    try:
        # Step 1: Check user permissions
        check_matches_permissions(request, ["CREATE", "UPDATE", "DELETE", "VIEW"])
        api_logger.debug("DEBUG: User has all required permissions.")

        # Step 1.5: Refresh all ages (tutors and children) before calculating matches
        from .utils import refresh_all_ages_for_matching
        age_refresh_result = refresh_all_ages_for_matching()
        api_logger.debug(f"DEBUG: Ages refreshed - tutors: {age_refresh_result['tutors_updated']}, children: {age_refresh_result['children_updated']}")

        # Step 2: Fetch possible matches
        possible_matches = fetch_possible_matches()
        api_logger.debug(f"DEBUG: Fetched {len(possible_matches)} possible matches.")

        # Step 3: Calculate distances and coordinates
        possible_matches = calculate_distances(possible_matches)
        api_logger.debug(f"DEBUG: Calculated distances and coordinates for possible matches.")

        # Step 4: Calculate grades
        graded_matches = calculate_grades(possible_matches)
        api_logger.debug(f"DEBUG: Calculated grades for matches.")

        # --- PRINT ALL TUTORS INCLUDED IN MATCHES ---
        tutor_ids = set(match["tutor_id"] for match in graded_matches)
        tutors = Tutors.objects.filter(id_id__in=tutor_ids).select_related("staff")
        api_logger.verbose("VERBOSE: Tutors included in matches:")
        for t in tutors:
            api_logger.verbose(
                f"VERBOSE: staff={t.staff.first_name} {t.staff.last_name}, id={t.id_id}"
            )

        #Step 5: Clear the possiblematches table
        api_logger.debug("DEBUG: Clearing possible matches table.")
        clear_possible_matches()

        # Step 6: Insert new matches (ALL matches - for the report to use)
        api_logger.debug(f"DEBUG: Inserting {len(graded_matches)} new matches into the database.")
        insert_new_matches(graded_matches)

        api_logger.debug("DEBUG: New matches inserted successfully.")
        api_logger.debug("DEBUG: Possible matches calculation completed.")

        # Step 7: Filter matches for wizard UI - only show children with 0 active/pending tutors
        # The full data is in PossibleMatches table for the report to use
        children_with_tutors = set(
            Tutorships.objects.filter(
                ~Q(tutorship_activation='inactive')
            ).values_list('child_id', flat=True)
        )
        wizard_matches = [
            match for match in graded_matches 
            if match['child_id'] not in children_with_tutors
        ]
        api_logger.debug(f"DEBUG: Filtered to {len(wizard_matches)} matches for wizard (children with 0 tutors).")

        return JsonResponse(
            {
                "message": "Possible matches calculated successfully.",
                "matches": wizard_matches,
            },
            status=200,
        )

    except PermissionError as e:
        api_logger.error(f"Permission error: {str(e)}")
        log_api_action(
            request=request,
            action='CALCULATE_MATCHES_FAILED',
            success=False,
            error_message=str(e),
            status_code=403
        )
        return JsonResponse({"error": str(e)}, status=403)

    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='CALCULATE_MATCHES_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_tutorships(request):
    api_logger.info("get_tutorships called")
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
            "tutorship_activation",
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
                "tutorship_activation": tutorship["tutorship_activation"],
            }
            for tutorship in tutorships
        ]
        return JsonResponse({"tutorships": tutorships_data}, status=200)
    except Exception as e:
        api_logger.error(f"Error fetching tutorships: {str(e)}")
        log_api_action(
            request=request,
            action='VIEW_TUTORSHIPS_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def create_tutorship(request):
    api_logger.info("create_tutorship called")
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
        api_logger.debug(f"Incoming request data: {data}")

        # Handle nested "match" object
        if "match" in data:
            match_data = data["match"]
            # Merge match data with the root-level fields
            data.update(match_data)

        # Validate required fields
        required_fields = ["child_id", "tutor_id", "staff_role_id"]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            api_logger.debug(f"Missing fields: {missing_fields}")
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
            api_logger.debug(f"Invalid staff_role_id: {staff_role_id}")
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
        
        # Handle existing tutorship
        if existing_tutorship:
            if existing_tutorship.tutorship_activation == 'inactive':
                # MANUAL MATCH OVERRIDE: Delete the inactive tutorship to allow re-creation
                api_logger.info(f"Deleting inactive tutorship {existing_tutorship.id} to allow re-creation")
                # Also delete associated PrevTutorshipStatuses
                PrevTutorshipStatuses.objects.filter(tutorship_id=existing_tutorship).delete()
                existing_tutorship.delete()
            else:
                # Only raise error if existing tutorship is NOT inactive
                # Get names for audit
                try:
                    child_name = f"{Children.objects.get(child_id=child_id).childfirstname} {Children.objects.get(child_id=child_id).childsurname}"
                except Children.DoesNotExist:
                    child_name = f"Unknown (ID: {child_id})"
                
                try:
                    tutor = Tutors.objects.get(id_id=tutor_id)
                    tutor_name = f"{tutor.staff.first_name} {tutor.staff.last_name}"
                    tutor_email = tutor.staff.email
                except (Tutors.DoesNotExist, AttributeError):
                    tutor_name = f"Unknown (ID: {tutor_id})"
                    tutor_email = "Unknown"
                
                log_api_action(
                    request=request,
                    action='CREATE_TUTORSHIP_FAILED',
                    success=False,
                    error_message=f"Tutorship already exists for \n\tchild: ID: {child_id}, Name: {child_name} and \n\ttutor: ID: {tutor_id}, Name: {tutor_name}",
                    status_code=409,  # Conflict status code
                    additional_data={
                        'child_id': child_id,
                        'child_name': child_name,
                        'tutor_id': tutor_id,
                        'tutor_name': tutor_name,
                        'tutor_email': tutor_email,
                        'existing_tutorship_id': existing_tutorship.id,
                        'existing_tutorship_status': existing_tutorship.tutorship_activation,
                        'reason': 'duplicate_tutorship'
                    }
                )
                return JsonResponse(
                    {"error": f"Tutorship already exists for this child and tutor combination. Existing tutorship ID: {existing_tutorship.id}"},
                    status=409,
                )

        # Retrieve child and tutor objects
        child = Children.objects.get(child_id=child_id)
        tutor = Tutors.objects.get(id_id=tutor_id)

        # MULTI-TUTOR SUPPORT: Check if child already has active or pending tutorships
        # We check for 'active' and 'pending_first_approval' only (no second approval state)
        existing_child_tutorships = Tutorships.objects.filter(
            child_id=child_id,
            tutorship_activation__in=['active', 'pending_first_approval']
        ).exists()

        # Clean up any stale/incomplete PrevTutorshipStatuses records for this child
        # This can happen if earlier tutorships were created in dev/test with NULL values
        # We only want ONE PrevTutorshipStatuses per child (for the first tutorship)
        if existing_child_tutorships:
            # Child already has tutorships, so delete any PrevTutorshipStatuses records
            # (they should have been cleaned up when the first tutorship was deleted)
            PrevTutorshipStatuses.objects.filter(child_id=child_id).delete()

        # MANUAL MATCH OVERRIDE: If tutor has PENDING tutorships with OTHER children, delete them
        # This is the "snatching" behavior - reassigning a pending tutor to a new child via manual match
        # But only delete pending tutorships - NOT if we're just adding a second tutor to this child
        pending_other_tutorships = Tutorships.objects.filter(
            tutor_id=tutor_id,
            tutorship_activation='pending_first_approval'
        ).exclude(child_id=child_id)
        
        if pending_other_tutorships.exists():
            api_logger.info(
                f"Deleting {pending_other_tutorships.count()} pending tutorships for tutor {tutor_id} "
                f"with other children (manual match override)"
            )
            pending_other_tutorships.delete()

        # MULTI-TUTOR SUPPORT: Save current statuses in PrevTutorshipStatuses ONLY for FIRST tutorship
        # This ensures we can restore the original status when the LAST tutorship is deleted
        prev_status = None
        if not existing_child_tutorships:
            prev_status = PrevTutorshipStatuses.objects.create(
                tutor_id=tutor,
                child_id=child,
                tutor_tut_status=tutor.tutorship_status,
                child_tut_status=child.tutoring_status,
            )

        # Create a new tutorship record in the database
        tutorship = Tutorships.objects.create(
            child_id=child_id,
            tutor_id=tutor_id,
            created_date=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            last_approver=[staff_role_id],  # Initialize with the creator's role ID
            approval_counter=1,  # Start with 1 approver
            tutorship_activation='pending_first_approval',  # INACTIVE STAFF FEATURE: Initially pending approval
        )

        # INACTIVE STAFF FEATURE: Clean up inactive tutorships for this tutor
        # When a new active tutorship is created, delete any tutorships with tutorship_activation='inactive'
        try:
            Tutorships.objects.filter(
                tutor_id=tutor_id,
                tutorship_activation='inactive'
            ).delete()
        except Exception as e:
            api_logger.warning(f"Failed to clean up inactive tutorships for tutor {tutor_id}: {str(e)}")

        # Link the prev_status record to the tutorship (only if prev_status was created for FIRST tutorship)
        if prev_status:
            prev_status.tutorship_id = tutorship
            prev_status.save()
        
        # MULTI-TUTOR SUPPORT: Only update child status if this is the FIRST tutorship
        if not existing_child_tutorships:
            child.tutoring_status = "יש_חונך"
            child.save()
        # If child already has tutorships, their status is already "יש_חונך", no need to change

        # Tutor status always changes (tutor can only have one tutee)
        tutor.tutorship_status = "יש_חניך"
        tutor.save()

        # Get names for audit
        child_name = f"{child.childfirstname} {child.childsurname}" if child else "Unknown"
        tutor_name = f"{tutor.staff.first_name} {tutor.staff.last_name}" if tutor and tutor.staff else "Unknown"
        
        # NEW WORKFLOW: Create "התאמת חניך" (Tutee Match) task for family coordinators
        tutee_match_task_created = False
        try:
            tutee_match_task_type = Task_Types.objects.filter(task_type="התאמת חניך").first()
            if tutee_match_task_type:
                # Get family coordinators
                family_coordinator_role = Role.objects.filter(role_name="Families Coordinator").first()
                if family_coordinator_role:
                    family_coordinators = Staff.objects.filter(roles=family_coordinator_role)
                    for coordinator in family_coordinators:
                        # Get tutor phone from SignedUp
                        tutor_phone = tutor.id.phone if tutor.id else "לא ידוע"
                        
                        task_data = {
                            "description": f"התאמת חניך - {tutor_name} ← {child_name}",
                            "due_date": (now().date() + datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
                            "status": "לא הושלמה",
                            "assigned_to": coordinator.staff_id,
                            "tutor": tutor_id,
                            "child": child_id,
                            "type": tutee_match_task_type.id,
                        }
                        task = create_task_internal(task_data)
                        api_logger.info(f"Created tutee match task {task.task_id} for tutorship {tutorship.id}")
                        tutee_match_task_created = True
                else:
                    api_logger.warning("Families Coordinator role not found, skipping tutee match task creation")
            else:
                api_logger.warning("Task type 'התאמת חניך' not found in database")
        except Exception as e:
            api_logger.error(f"Error creating tutee match task: {str(e)}")

        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships', 'childsmile_app_prevtutorshipstatuses', 'childsmile_app_children', 'childsmile_app_tutors'],
            entity_type='Tutorship',
            entity_ids=[tutorship.id],
            success=True,
            additional_data={
                'child_id': child_id,
                'child_name': child_name,
                'tutor_id': tutor_id,
                'tutor_name': tutor_name,
                'tutor_email': tutor.staff.email if tutor and tutor.staff else 'Unknown',
                'staff_role_id': staff_role_id,
                'approval_counter': 1
            }
        )
        
        api_logger.debug(f"Tutorship created successfully with ID {tutorship.id}")
        return JsonResponse(
            {"message": "Tutorship created successfully", "tutorship_id": tutorship.id},
            status=201,
        )
    except Children.DoesNotExist:
        # Try to get tutor name if available
        tutor_name = "Unknown"
        tutor_email = "Unknown"
        try:
            tutor = Tutors.objects.get(id_id=data.get('tutor_id'))
            tutor_name = f"{tutor.staff.first_name} {tutor.staff.last_name}"
            tutor_email = tutor.staff.email
        except (Tutors.DoesNotExist, AttributeError):
            pass
        
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Child with ID {data.get('child_id')} not found",
            status_code=404,
            additional_data={
                'child_id': data.get('child_id'),
                'child_name': 'Not Found',
                'tutor_id': data.get('tutor_id'),
                'tutor_name': tutor_name,
                'tutor_email': tutor_email
            }
        )
        return JsonResponse({"error": f"Child with ID {data.get('child_id')} not found"}, status=404)
    except Tutors.DoesNotExist:
        # Try to get child name if available
        child_name = "Unknown"
        try:
            child = Children.objects.get(child_id=data.get('child_id'))
            child_name = f"{child.childfirstname} {child.childsurname}"
        except Children.DoesNotExist:
            pass
        
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Tutor with ID {data.get('tutor_id')} not found",
            status_code=404,
            additional_data={
                'child_id': data.get('child_id'),
                'child_name': child_name,
                'tutor_id': data.get('tutor_id'),
                'tutor_name': 'Not Found'
            }
        )
        return JsonResponse({"error": f"Tutor with ID {data.get('tutor_id')} not found"}, status=404)
    except KeyError as e:
        api_logger.error(f"Missing key in request data: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=f"Missing key: {str(e)}",
            status_code=400
        )
        return JsonResponse({"error": f"Missing key: {str(e)}"}, status=400)
    except Exception as e:
        api_logger.error(f"An error occurred while creating a tutorship: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def update_tutorship(request, tutorship_id):
    api_logger.info(f"update_tutorship called for tutorship_id: {tutorship_id}")
    """
    Update an existing tutorship record.
    """
    api_logger.debug(f"Received request to update tutorship with ID {tutorship_id}")
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
    api_logger.debug(f"Incoming request data for update: {data}")
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
        # Get child and tutor names for audit
        child_name = f"{tutorship.child.childfirstname} {tutorship.child.childsurname}" if tutorship.child else "Unknown"
        tutor_name = f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}" if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        tutor_email = tutorship.tutor.staff.email if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="This role has already approved this tutorship",
            status_code=400,
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            additional_data={
                'child_id': tutorship.child_id,
                'child_name': child_name,
                'tutor_id': tutorship.tutor_id,
                'tutor_name': tutor_name,
                'tutor_email': tutor_email,
                'staff_role_id': staff_role_id,
                'current_approval_counter': tutorship.approval_counter,
                'last_approvers': tutorship.last_approver,
                'reason': 'duplicate_approval'
            }
        )
        return JsonResponse(
            {"error": "This role has already approved this tutorship"}, status=400
        )
    try:
        old_approval_counter = tutorship.approval_counter
        
        # NEW WORKFLOW: Block final approval if "התאמת חניך" task is not completed
        would_be_final_approval = (old_approval_counter == 1)  # Next approval would make it 2
        if would_be_final_approval:
            # Check if there's an incomplete "התאמת חניך" task for this tutor
            tutee_match_task_type = Task_Types.objects.filter(task_type="התאמת חניך").first()
            if tutee_match_task_type:
                incomplete_tutee_match_task = Tasks.objects.filter(
                    related_tutor_id=tutorship.tutor_id,
                    task_type=tutee_match_task_type,
                    status__in=["לא הושלמה", "בביצוע"]
                ).first()
                if incomplete_tutee_match_task:
                    child_name = f"{tutorship.child.childfirstname} {tutorship.child.childsurname}" if tutorship.child else "Unknown"
                    tutor_name = f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}" if tutorship.tutor and tutorship.tutor.staff else "Unknown"
                    
                    log_api_action(
                        request=request,
                        action='UPDATE_TUTORSHIP_FAILED',
                        success=False,
                        error_message="Cannot final approve: Tutee match task not completed",
                        status_code=400,
                        entity_type='Tutorship',
                        entity_ids=[tutorship_id],
                        additional_data={
                            'child_name': child_name,
                            'tutor_name': tutor_name,
                            'reason': 'tutee_match_task_incomplete',
                            'incomplete_task_id': incomplete_tutee_match_task.task_id
                        }
                    )
                    return JsonResponse({
                        "error": "לא ניתן לאשר סופית - משימת התאמת חניך לא הושלמה",
                        "error_code": "TUTEE_MATCH_INCOMPLETE",
                        "task_id": incomplete_tutee_match_task.task_id
                    }, status=400)
        
        tutorship.last_approver.append(staff_role_id)
        if tutorship.approval_counter <= 2:
            tutorship.approval_counter = len(tutorship.last_approver)
        else:
            raise ValueError("Approval counter cannot exceed 2")
        
        # INACTIVE STAFF FEATURE: Set tutorship_activation to 'active' when final approval is reached
        if tutorship.approval_counter == 2:
            tutorship.tutorship_activation = 'active'
        
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
                    api_logger.debug(f"Added 'Tutor' role to staff {staff_member.username}")

        # Get child and tutor names for audit
        child_name = f"{tutorship.child.childfirstname} {tutorship.child.childsurname}" if tutorship.child else "Unknown"
        tutor_name = f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}" if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        tutor_email = tutorship.tutor.staff.email if tutorship.tutor and tutorship.tutor.staff else "Unknown"

        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships'] + (['childsmile_app_staff'] if tutor_role_added else []),
            entity_type='Tutorship',
            entity_ids=[tutorship.id],
            success=True,
            additional_data={
                'child_id': tutorship.child_id,
                'child_name': child_name,
                'tutor_id': tutorship.tutor_id,
                'tutor_name': tutor_name,
                'tutor_email': tutor_email,
                'old_approval_counter': old_approval_counter,
                'new_approval_counter': tutorship.approval_counter,
                'staff_role_id': staff_role_id,
                'tutor_role_added': tutor_role_added,
                'tutorship_approved': tutorship.approval_counter == 2
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
        api_logger.error(f"An error occurred while updating the tutorship: {str(e)}")
        
        # Get child and tutor names for audit error
        child_name = f"{tutorship.child.childfirstname} {tutorship.child.childsurname}" if tutorship.child else "Unknown"
        tutor_name = f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}" if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            additional_data={
                'child_id': tutorship.child_id,
                'child_name': child_name,
                'tutor_id': tutorship.tutor_id,
                'tutor_name': tutor_name,
                'staff_role_id': staff_role_id
            }
        )
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
@api_view(["DELETE"])
def delete_tutorship(request, tutorship_id):
    api_logger.info(f"delete_tutorship called for tutorship_id: {tutorship_id}")
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

    try:
        # FETCH TUTORSHIP FIRST - so we have data for audit logs
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
                entity_ids=[tutorship_id],
                additional_data={
                    'child_id': 'Unknown - Not Found',
                    'child_name': 'Unknown - Not Found',
                    'tutor_id': 'Unknown - Not Found',
                    'tutor_name': 'Unknown - Not Found',
                }   
            )
            return JsonResponse({"error": "Tutorship not found"}, status=404)

        # Get child and tutor names BEFORE permission check - for audit logs
        tutor = tutorship.tutor
        child = tutorship.child
        child_id = tutorship.child_id
        child_name = f"{child.childfirstname} {child.childsurname}" if child else "Unknown"
        tutor_id = tutorship.tutor_id
        tutor_name = f"{tutor.staff.first_name} {tutor.staff.last_name}" if tutor and tutor.staff else "Unknown"
        tutor_email = tutor.staff.email if tutor and tutor.staff else "Unknown"

        # NOW CHECK PERMISSION - we have data for audit logs if it fails
        if not has_permission(request, "tutorships", "DELETE"):
            log_api_action(
                request=request,
                action='DELETE_TUTORSHIP_FAILED',
                success=False,
                error_message="You do not have permission to delete this tutorship",
                status_code=401,
                entity_type='Tutorship',
                entity_ids=[tutorship_id],
                additional_data={
                    'child_id': child_id,
                    'child_name': child_name,
                    'tutor_id': tutor_id,
                    'tutor_name': tutor_name,
                    'tutor_email': tutor_email
                }
            )
            return JsonResponse(
                {"error": "You do not have permission to delete this tutorship."},
                status=401,
            )

        # Find the PrevTutorshipStatuses record for this tutorship
        # NOTE: prev_status only exists for the FIRST tutorship (multi-tutor support)
        prev_status = PrevTutorshipStatuses.objects.filter(
            tutorship_id=tutorship
        ).order_by('-last_updated').first()

        # MULTI-TUTOR SUPPORT: Check if child has OTHER active or pending tutorships
        # Only 'active' and 'pending_first_approval' exist (no second approval state)
        other_child_tutorships = Tutorships.objects.filter(
            child_id=child_id,
            tutorship_activation__in=['active', 'pending_first_approval']
        ).exclude(id=tutorship_id).exists()

        status_restored = False
        
        # Always restore tutor status (tutor only has one tutee)
        if prev_status:
            tutor.tutorship_status = prev_status.tutor_tut_status
        else:
            tutor.tutorship_status = "אין_חניך"
        tutor.save()
        
        # MULTI-TUTOR SUPPORT: Only restore child status if this is the LAST tutorship
        if not other_child_tutorships:
            if prev_status:
                child.tutoring_status = prev_status.child_tut_status
            else:
                # Use "למצוא_חונך" which is the valid enum value (not "מחפש_חונך")
                child.tutoring_status = "למצוא_חונך"
            child.save()
            status_restored = True
        # If child has other tutorships, keep status as "יש_חונך"
        
        # Delete the "התאמת חניך" task for this tutor if exists
        try:
            tutee_match_task_type = Task_Types.objects.filter(task_type="התאמת חניך").first()
            if tutee_match_task_type:
                tutee_match_tasks = Tasks.objects.filter(
                    task_type=tutee_match_task_type,
                    related_tutor=tutor,
                    related_child=child
                )
                deleted_task_count = tutee_match_tasks.count()
                tutee_match_tasks.delete()
                if deleted_task_count > 0:
                    api_logger.info(f"Deleted tutee match task for tutor {tutor_id} and child {child_id} after tutorship deletion")
        except Exception as e:
            api_logger.error(f"Error deleting tutee match task: {str(e)}")
        
        # Delete the tutorship record FIRST (before deleting prev_status, so the FK isn't violated)
        tutorship.delete()

        # Delete ALL PrevTutorshipStatuses records for this child if this was the last tutorship
        # This ensures we don't accumulate stale records (especially important if first tutorship had NULL values)
        if not other_child_tutorships:
            PrevTutorshipStatuses.objects.filter(child_id=child_id).delete()

        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships', 'childsmile_app_prevtutorshipstatuses', 'childsmile_app_children', 'childsmile_app_tutors'],
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            success=True,
            additional_data={
                'deleted_child_id': child_id,
                'deleted_child_name': child_name,
                'deleted_tutor_id': tutor_id,
                'deleted_tutor_name': tutor_name,
                'deleted_tutor_email': tutor_email,
                'status_restored': status_restored,
                'tutor_old_status': prev_status.tutor_tut_status if prev_status else 'יש_חניך',
                'child_old_status': prev_status.child_tut_status if prev_status else 'יש_חונך'
            }
        )

        api_logger.debug(f"Tutorship with ID {tutorship_id} deleted successfully.")
        return JsonResponse(
            {"message": "Tutorship deleted successfully", "tutorship_id": tutorship_id},
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while deleting the tutorship: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_TUTORSHIP_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutorship',
            entity_ids=[tutorship_id],
            additional_data={
                'child_id': child_id if 'child_id' in locals() else 'Unknown - Error',
                'child_name': child_name if 'child_name' in locals() else 'Unknown - Error',
                'tutor_id': tutor_id if 'tutor_id' in locals() else 'Unknown - Error',
                'tutor_name': tutor_name if 'tutor_name' in locals() else 'Unknown - Error',
                'tutor_email': tutor_email if 'tutor_email' in locals() else 'Unknown - Error'
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_available_tutors(request):
    """
    Get all available tutors (those who can be matched) for manual matching.
    Returns tutor name and city for combo box display.
    Uses the same filtering logic as fetch_possible_matches() for consistency.
    """
    api_logger.info("get_available_tutors called")
    try:
        # Check permissions
        check_matches_permissions(request, ["VIEW"])
        
        child_id = request.GET.get('child_id')
        if not child_id:
            return JsonResponse(
                {"error": "Missing child_id parameter"},
                status=400
            )
        
        # SQL to get available tutors (same filtering logic as fetch_possible_matches)
        # Match gender requirement
        query = """
        SELECT DISTINCT
            tutor.id_id AS tutor_id,
            CONCAT(signedup.first_name, ' ', signedup.surname) AS tutor_full_name,
            signedup.city AS tutor_city,
            staff.is_active,
            signedup.age AS tutor_age,
            signedup.gender,
            signedup.first_name,
            signedup.surname
        FROM childsmile_app_tutors tutor
        JOIN childsmile_app_signedup signedup
            ON signedup.id = tutor.id_id
        JOIN childsmile_app_staff staff
            ON tutor.staff_id = staff.staff_id
        JOIN childsmile_app_children child
            ON child.gender = signedup.gender
        WHERE
            child.child_id = %s
            -- Exclude tutors that have ACTIVE tutorships
            AND NOT EXISTS (
                SELECT 1
                FROM childsmile_app_tutorships tutorship
                WHERE tutorship.tutor_id = tutor.id_id
                AND tutorship.tutorship_activation = 'active'
            )
            -- Exclude tutors that already have ANY tutorship with this child (even inactive)
            AND NOT EXISTS (
                SELECT 1
                FROM childsmile_app_tutorships tutorship
                WHERE tutorship.tutor_id = tutor.id_id
                AND tutorship.child_id = child.child_id
            )
            -- Only include staff members who are ACTIVE
            AND staff.is_active = TRUE
        ORDER BY signedup.first_name, signedup.surname;
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [child_id])
            rows = cursor.fetchall()
            
        tutors_list = [
            {
                "tutor_id": row[0],
                "tutor_full_name": row[1],
                "tutor_city": row[2],
                "is_active": row[3],
                "tutor_age": row[4],
                "tutor_gender": row[5],
            }
            for row in rows
        ]
        
        api_logger.debug(f"DEBUG: Found {len(tutors_list)} available tutors for manual matching for child {child_id}")
        return JsonResponse({"tutors": tutors_list}, status=200)
        
    except PermissionError as e:
        api_logger.error(f"Permission error in get_available_tutors: {str(e)}")
        return JsonResponse({"error": str(e)}, status=403)
    except Exception as e:
        api_logger.error(f"Error fetching available tutors: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def calculate_manual_match(request):
    """
    Calculate a match for a manually selected tutor-child pair.
    Takes child_id and tutor_id, runs the full matching algorithm,
    and returns the single match with all details (grade, distances, coordinates).
    """
    api_logger.info("calculate_manual_match called")
    try:
        # Check permissions
        check_matches_permissions(request, ["VIEW"])
        
        # Refresh all ages (tutors and children) before calculating manual match
        from .utils import refresh_all_ages_for_matching
        age_refresh_result = refresh_all_ages_for_matching()
        api_logger.debug(f"DEBUG: Ages refreshed for manual match - tutors: {age_refresh_result['tutors_updated']}, children: {age_refresh_result['children_updated']}")
        
        data = request.data
        child_id = data.get("child_id")
        tutor_id = data.get("tutor_id")
        
        if not child_id or not tutor_id:
            return JsonResponse(
                {"error": "Missing child_id or tutor_id"},
                status=400
            )
        
        api_logger.debug(f"DEBUG: Calculating match for child {child_id} and tutor {tutor_id}")
        
        # Use the same SQL logic as fetch_possible_matches but for this specific pair
        # IMPORTANT: Manual match does NOT allow re-creating inactive tutorships
        # Only the wizard allows that via fetch_possible_matches filtering
        query = """
        SELECT
            child.child_id,
            tutor.id_id AS tutor_id,
            CONCAT(child.childfirstname, ' ', child.childsurname) AS child_full_name,
            CONCAT(signedup.first_name, ' ', signedup.surname) AS tutor_full_name,
            child.city AS child_city,
            signedup.city AS tutor_city,
            child.date_of_birth AS child_birth_date,
            EXTRACT(YEAR FROM AGE(current_date, child.date_of_birth))::int AS child_age,
            signedup.birth_date AS tutor_birth_date,
            signedup.age AS tutor_age,
            child.gender AS child_gender,
            signedup.gender AS tutor_gender,
            0 AS distance_between_cities,
            100 AS grade,
            FALSE AS is_used,
            child.tutoring_status AS child_tutoring_status,
            CONCAT(signedup.first_name, ' ', signedup.surname) AS child_responsible_coordinator,
            child.medical_diagnosis,
            child.child_phone_number,
            child.treating_hospital,
            child.marital_status,
            child.num_of_siblings,
            child.details_for_tutoring,
            child.additional_info,
            child.registrationdate,
            signedup.phone,
            signedup.email,
            staff.is_active
        FROM childsmile_app_children child
        INNER JOIN childsmile_app_tutors tutor
            ON tutor.id_id = %s
        INNER JOIN childsmile_app_signedup signedup
            ON signedup.id = tutor.id_id
        INNER JOIN childsmile_app_staff staff
            ON tutor.staff_id = staff.staff_id
        WHERE 
            child.child_id = %s
            -- Gender must match
            AND child.gender = signedup.gender
            -- Prevent ANY tutorship with this pair (manual match is strict, only wizard allows re-creation)
            AND NOT EXISTS (
                SELECT 1
                FROM childsmile_app_tutorships tutorship
                WHERE tutorship.child_id = child.child_id
                AND tutorship.tutor_id = tutor.id_id
            )
            -- Only allow ACTIVE staff members
            AND staff.is_active = TRUE
            -- Exclude deceased and healthy children
            AND child.status NOT IN (%s, %s)
        """
        
        # Use parameterized query for Hebrew values to avoid encoding issues
        excluded_statuses = ('בריא', 'ז״ל')
        with connection.cursor() as cursor:
            cursor.execute(query, [tutor_id, child_id] + list(excluded_statuses))
            row = cursor.fetchone()
        
        if not row:
            # Log detailed debugging info
            api_logger.warning(f"DEBUG: No match found for child {child_id} and tutor {tutor_id}")
            
            # Check if child and tutor exist
            try:
                child = Children.objects.get(child_id=child_id)
                api_logger.warning(f"DEBUG: Child exists - ID: {child_id}, Status: {child.status}, Tutoring Status: {child.tutoring_status}, Gender: {child.gender}")
            except Children.DoesNotExist:
                api_logger.warning(f"DEBUG: Child does not exist - ID: {child_id}")
                return JsonResponse(
                    {"error": f"Child with ID {child_id} does not exist"},
                    status=404
                )
            
            try:
                tutor = Tutors.objects.get(id_id=tutor_id)
                tutor_signedup = SignedUp.objects.get(id=tutor_id)
                api_logger.warning(f"DEBUG: Tutor exists - ID: {tutor_id}, Gender: {tutor_signedup.gender}, Active: {tutor.staff.is_active}")
            except (Tutors.DoesNotExist, SignedUp.DoesNotExist):
                api_logger.warning(f"DEBUG: Tutor does not exist - ID: {tutor_id}")
                return JsonResponse(
                    {"error": f"Tutor with ID {tutor_id} does not exist"},
                    status=404
                )
            
            # Check if there are conflicting tutorships
            all_tutorships = Tutorships.objects.filter(
                child_id=child_id,
                tutor_id=tutor_id
            )
            api_logger.warning(f"DEBUG: Existing tutorships for this pair: {all_tutorships.count()}")
            for ts in all_tutorships:
                api_logger.warning(f"  - Tutorship ID {ts.id}: Status = {ts.tutorship_activation}")
            
            conflicting_child_tutorship = Tutorships.objects.filter(
                child_id=child_id,
                tutorship_activation__in=['active', 'pending_first_approval']
            ).exclude(tutor_id=tutor_id)
            api_logger.warning(f"DEBUG: Child has other active/pending tutorships: {conflicting_child_tutorship.count()}")
            
            conflicting_tutor_tutorship = Tutorships.objects.filter(
                tutor_id=tutor_id,
                tutorship_activation='active'
            )
            api_logger.warning(f"DEBUG: Tutor has active tutorship with other children: {conflicting_tutor_tutorship.count()}")
            for ts in conflicting_tutor_tutorship:
                api_logger.warning(f"  - Tutorship ID {ts.id}: Child {ts.child_id}, Status = {ts.tutorship_activation}")
            
            return JsonResponse(
                {"error": "No valid match found for this child-tutor pair"},
                status=404
            )
        
        # Build the match dict
        match = {
            "child_id": row[0],
            "tutor_id": row[1],
            "child_full_name": row[2],
            "tutor_full_name": row[3],
            "child_city": row[4],
            "tutor_city": row[5],
            "child_birth_date": row[6].strftime("%d/%m/%Y") if row[6] else None,
            "child_age": row[7],
            "tutor_birth_date": row[8].strftime("%d/%m/%Y") if row[8] else None,
            "tutor_age": row[9],
            "child_gender": row[10],
            "tutor_gender": row[11],
            "distance_between_cities": row[12],
            "grade": row[13],
            "is_used": row[14],
            "child_tutoring_status": row[15],
            "child_responsible_coordinator": row[16],
            "medical_diagnosis": row[17],
            "child_phone_number": row[18],
            "treating_hospital": row[19],
            "marital_status": row[20],
            "num_of_siblings": row[21],
            "details_for_tutoring": row[22],
            "additional_info": row[23],
            "registrationdate": row[24].strftime("%d/%m/%Y") if row[24] else None,
            "tutor_phone": row[25],
            "tutor_email": row[26],
            "tutor_is_active": row[27],
        }
        
        # Wrap in a list so we can use the same distance/grade calculation logic
        matches = [match]
        
        # Calculate distances using the same helper function
        matches = calculate_distances(matches)
        api_logger.debug(f"DEBUG: Calculated distance for match")
        
        # Calculate grades using the same helper function
        matches = calculate_grades(matches)
        api_logger.debug(f"DEBUG: Calculated grade for match: {matches[0]['grade']}")
        
        return JsonResponse(
            {
                "message": "Manual match calculated successfully",
                "match": matches[0]
            },
            status=200
        )
        
    except PermissionError as e:
        api_logger.error(f"Permission error in calculate_manual_match: {str(e)}")
        return JsonResponse({"error": str(e)}, status=403)
    except Exception as e:
        api_logger.error(f"Error calculating manual match: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PATCH"])
def update_tutorship_created_date(request, tutorship_id):
    """
    Update the created_date of a tutorship record.
    Useful for correcting the date when a tutorship was manually created.
    Only users with UPDATE permission on tutorships can use this.
    """
    api_logger.info(f"update_tutorship_created_date called for tutorship_id: {tutorship_id}")
    
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

    # Check if the user has UPDATE permission on tutorships
    if not has_permission(request, "tutorships", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_FAILED',
            success=False,
            error_message="You do not have permission to update tutorship created date",
            status_code=401,
            entity_type='Tutorship',
            entity_ids=[tutorship_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update this tutorship."}, status=401
        )

    try:
        # Fetch the tutorship
        tutorship = Tutorships.objects.get(id=tutorship_id)
        
        # Get request data
        data = request.data
        new_created_date = data.get("created_date")
        
        if not new_created_date:
            return JsonResponse(
                {"error": "created_date is required in the request body"},
                status=400
            )
        
        # Parse the date - accept ISO format or common datetime formats
        try:
            # Try parsing as ISO datetime first
            if 'T' in str(new_created_date):
                from dateutil import parser as date_parser
                parsed_date = date_parser.isoparse(str(new_created_date))
            else:
                # Try common datetime formats
                from django.utils.dateparse import parse_datetime, parse_date
                parsed_date = parse_datetime(str(new_created_date))
                if not parsed_date:
                    parsed_date = parse_date(str(new_created_date))
                    if parsed_date:
                        from datetime import datetime
                        parsed_date = datetime.combine(parsed_date, datetime.min.time())
            
            if not parsed_date:
                return JsonResponse(
                    {"error": "Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)"},
                    status=400
                )
        except Exception as e:
            return JsonResponse(
                {"error": f"Date parsing error: {str(e)}"},
                status=400
            )
        
        # Store old date for audit log
        old_created_date = tutorship.created_date
        
        # Update the created_date
        tutorship.created_date = parsed_date
        tutorship.save()
        
        # Get child and tutor names for audit
        child_name = f"{tutorship.child.childfirstname} {tutorship.child.childsurname}" if tutorship.child else "Unknown"
        tutor_name = f"{tutorship.tutor.staff.first_name} {tutorship.tutor.staff.last_name}" if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        tutor_email = tutorship.tutor.staff.email if tutorship.tutor and tutorship.tutor.staff else "Unknown"
        
        log_api_action(
            request=request,
            action='UPDATE_TUTORSHIP_SUCCESS',
            affected_tables=['childsmile_app_tutorships'],
            entity_type='Tutorship',
            entity_ids=[tutorship.id],
            success=True,
            additional_data={
                'child_id': tutorship.child_id,
                'child_name': child_name,
                'tutor_id': tutorship.tutor_id,
                'tutor_name': tutor_name,
                'tutor_email': tutor_email,
                'old_created_date': old_created_date.isoformat() if old_created_date else None,
                'new_created_date': parsed_date.isoformat() if parsed_date else None,
            }
        )
        
        api_logger.debug(f"Tutorship {tutorship_id} created_date updated from {old_created_date} to {parsed_date}")
        
        return JsonResponse(
            {
                "message": "Tutorship created date updated successfully",
                "tutorship_id": tutorship.id,
                "old_created_date": old_created_date.isoformat() if old_created_date else None,
                "new_created_date": parsed_date.isoformat() if parsed_date else None
            },
            status=200
        )
        
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
    except Exception as e:
        api_logger.error(f"Error updating tutorship created_date: {str(e)}")
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