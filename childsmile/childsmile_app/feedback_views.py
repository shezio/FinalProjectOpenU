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
from .audit_utils import log_api_action
from .logger import api_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@conditional_csrf
@api_view(["POST"])
def create_tutor_feedback(request):
    api_logger.info("create_tutor_feedback called")
    """
    Create a new tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "CREATE"):
        log_api_action(
            request=request,
            action='CREATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to create a tutor feedback",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to create a tutor feedback."},
            status=401,
        )

    try:
        data = request.data

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "tutee_name",
            "tutor_name",
            "feedback_type",
        ]
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.extend(["hospital_name"])
            required_fields.remove("tutee_name")
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_TUTOR_FEEDBACK_FAILED',
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

        staff_filling_id = data.get("staff_id")
        error = None
        initial_family_data = None  # Initialize to None
        
        try:
            feedback = Feedback.objects.create(
                timestamp=data.get("feedback_filled_at"),
                event_date=make_aware(
                    datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
                ),
                staff_id=staff_filling_id,
                description=data.get("description"),
                exceptional_events=(
                    data.get("exceptional_events")
                    if data.get("exceptional_events")
                    else None
                ),
                anything_else=(
                    data.get("anything_else") if data.get("anything_else") else None
                ),
                comments=data.get("comments") if data.get("comments") else None,
                feedback_type=data.get("feedback_type"),
                hospital_name=(
                    data.get("hospital_name") if data.get("hospital_name") else None
                ),
                additional_volunteers=(
                    data.get("additional_volunteers")
                    if data.get("additional_volunteers")
                    else None
                ),
                names=data.get("names") if data.get("names") else None,
                phones=data.get("phones") if data.get("phones") else None,
                other_information=(
                    data.get("other_information")
                    if data.get("other_information")
                    else None
                ),
            )
        except Exception as e:
            error = str(e)
            error_type = "feedback_creation_error"
            api_logger.error(f"Error creating feedback: {error}")

        # Get the tutor's id_id from Tutors using the user_id
        api_logger.debug(f"User ID: {user_id}")
        tutor = Tutors.objects.filter(staff_id=staff_filling_id).first()
        api_logger.debug(f"Tutor found: {tutor}")
        if not tutor:
            api_logger.debug(f"No tutor found for staff ID {staff_filling_id}")
            log_api_action(
                request=request,
                action='CREATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message="No tutor found for the provided staff ID",
                status_code=404,
                additional_data={'staff_id': staff_filling_id}
            )
            return JsonResponse(
                {"error": "No tutor found for the provided staff ID."}, status=404
            )

        tutor_id_id = tutor.id_id
        if not error:
            try:
                tutor_feedback = Tutor_Feedback.objects.create(
                    feedback=feedback,
                    tutee_name=(
                        data.get("tutee_name")
                        if data.get("tutee_name")
                        else "ביקור בבית חולים " + feedback.hospital_name
                    ),
                    tutor_name=data.get("tutor_name"),
                    tutor_id=tutor_id_id,
                    is_it_your_tutee=data.get("is_it_your_tutee"),
                    is_first_visit=data.get("is_first_visit"),
                )

                api_logger.info(
                    f"Tutor feedback created successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "tutor_feedback_creation_error"
                api_logger.error(
                    f"An error occurred while creating tutor feedback: {error}"
                )

        if not error:
            try:
                if (
                    data.get("feedback_type") == "general_volunteer_hospital_visit"
                    and data.get("names")
                    and data.get("phones")
                ):
                    initial_family_data = InitialFamilyData.objects.create(
                        names=data["names"],
                        phones=data["phones"],
                        other_information=data.get("other_information", ""),
                    )

                    api_logger.info(
                        f"InitialFamilyData created with ID {initial_family_data.initial_family_data_id}"
                    )
            except Exception as e:
                error = str(e)
                error_type = "initial_family_data_creation_error"
                api_logger.error(
                    f"An error occurred while creating InitialFamilyData: {error}"
                )

        # FIXED: Only create tasks if initial_family_data was actually created
        if not error and initial_family_data is not None:
            try:
                task_type = Task_Types.objects.get(task_type="הוספת משפחה")
                create_tasks_for_technical_coordinators_async(
                    initial_family_data, task_type.id
                )
                api_logger.info("Tasks for Technical Coordinators created successfully.")
            except Exception as e:
                error = str(e)
                error_type = "task_creation_error"
                api_logger.error(
                    f"An error occurred while creating tasks for Technical Coordinators: {error}"
                )

        if error:
            # Clean up on error
            if 'feedback' in locals():
                feedback.delete()
            if "tutor_feedback" in locals():
                tutor_feedback.delete()
            if initial_family_data is not None:
                initial_family_data.delete()
            
            log_api_action(
                request=request,
                action='CREATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message=f"An error occurred while creating tutor feedback: {error} (Error Type: {error_type})",
                status_code=500,
                additional_data={'error_type': error_type}
            )
            raise Exception(
                f"An error occurred while creating tutor feedback: {error} (Error Type: {error_type})"
            )

        # Log successful creation
        log_api_action(
            request=request,
            action='CREATE_TUTOR_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_tutor_feedback'],
            entity_type='Tutor_Feedback',
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                'feedback_type': data.get("feedback_type"),
                'tutor_name': data.get("tutor_name"),
                'tutee_name': data.get("tutee_name"),
                'event_date': data.get("event_date"),
                'created_family_data': initial_family_data is not None
            }
        )

        return JsonResponse(
            {
                "message": "Tutor feedback created successfully",
                "feedback_id": feedback.feedback_id,
                "tutor_feedback_id": tutor_feedback.feedback_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating tutor feedback: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def update_tutor_feedback(request, feedback_id):
    api_logger.info(f"update_tutor_feedback called for feedback_id: {feedback_id}")
    """
    Update an existing tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to update a tutor feedback",
            status_code=401,
            entity_type='Tutor_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update a tutor feedback."},
            status=401,
        )

    try:
        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "tutee_name",
            "tutor_name",
            "feedback_type",
        ]
        # Check if we hospital_name is empty if the feedback_type is general_volunteer_hospital_visit - add them to the required fields
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.extend(["hospital_name"])
            # remove tutee name from the required fields
            required_fields.remove("tutee_name")
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='UPDATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Update the existing tutor feedback record in the database
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action='UPDATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message="Tutor feedback not found",
                status_code=404,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse(
                {"error": "Tutor feedback not found."},
                status=404,
            )
        staff_filling_id = data.get("staff_id")
        # Get the tutor's id_id from Tutors using the user_id (which is staff_id in Tutors)
        tutor = Tutors.objects.filter(staff_id=staff_filling_id).first()
        api_logger.debug(f"Tutor found: {tutor}")  # Log the tutor found
        if not tutor:
            api_logger.debug(f"No tutor found for staff ID {staff_filling_id}")
            log_api_action(
                request=request,
                action='UPDATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message="No tutor found for the provided staff ID",
                status_code=404,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id],
                additional_data={'staff_id': staff_filling_id}
            )
            return JsonResponse(
                {"error": "No tutor found for the provided staff ID."}, status=404
            )

        error = None
        try:
            feedback.timestamp = data.get("feedback_filled_at")
            feedback.event_date = make_aware(
                datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
            )
            feedback.staff_id = staff_filling_id
            feedback.description = data.get("description")
            feedback.exceptional_events = (
                data.get("exceptional_events")
                if data.get("exceptional_events")
                else None
            )
            feedback.anything_else = (
                data.get("anything_else") if data.get("anything_else") else None
            )
            feedback.comments = data.get("comments") if data.get("comments") else None
            feedback.hospital_name = (
                data.get("hospital_name") if data.get("hospital_name") else None
            )
            feedback.additional_volunteers = (
                data.get("additional_volunteers")
                if data.get("additional_volunteers")
                else None
            )
            feedback.names = data.get("names") if data.get("names") else None
            feedback.phones = data.get("phones") if data.get("phones") else None
            feedback.other_information = (
                data.get("other_information") if data.get("other_information") else None
            )
            feedback.save()
        except Exception as e:
            error = str(e)
            error_type = "feedback_update_error"
            api_logger.error(f"Error updating feedback: {error}")

        tutor_id_id = tutor.id_id

        if not error:
            try:
                tutor_feedback = Tutor_Feedback.objects.filter(
                    feedback=feedback
                ).first()
                if not tutor_feedback:
                    log_api_action(
                        request=request,
                        action='UPDATE_TUTOR_FEEDBACK_FAILED',
                        success=False,
                        error_message="Tutor feedback record not found",
                        status_code=404,
                        entity_type='Tutor_Feedback',
                        entity_ids=[feedback_id]
                    )
                    return JsonResponse(
                        {"error": "Tutor feedback not found."},
                        status=404,
                    )

                tutor_feedback.tutee_name = (
                    data.get("tutee_name")
                    if data.get("tutee_name")
                    else "ביקור בבית חולים " + feedback.hospital_name
                )
                tutor_feedback.tutor_name = data.get("tutor_name")
                tutor_feedback.tutor_id = tutor_id_id
                tutor_feedback.is_it_your_tutee = data.get("is_it_your_tutee")
                tutor_feedback.is_first_visit = data.get("is_first_visit")
                tutor_feedback.save()

                api_logger.info(
                    f"Tutor feedback updated successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "tutor_feedback_update_error"
                api_logger.error(
                    f"An error occurred while updating tutor feedback: {error}"
                )

        if error:
            log_api_action(
                request=request,
                action='UPDATE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message=f"Error updating tutor feedback: {error} (Error Type: {error_type})",
                status_code=500,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id],
                additional_data={'error_type': error_type}
            )
            return JsonResponse({"error": f"{error_type}: {error}"}, status=500)

        # Log successful update
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_tutor_feedback'],
            entity_type='Tutor_Feedback',
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                'feedback_type': data.get("feedback_type"),
                'tutor_name': data.get("tutor_name"),
                'tutee_name': data.get("tutee_name"),
                'event_date': data.get("event_date")
            }
        )

        return JsonResponse(
            {
                "message": "Tutor feedback updated successfully",
                "feedback_id": feedback.feedback_id,
                "tutor_feedback_id": tutor_feedback.feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while updating tutor feedback: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutor_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_tutor_feedback(request, feedback_id):
    api_logger.info(f"delete_tutor_feedback called for feedback_id: {feedback_id}")
    """
    Delete a tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "DELETE"):
        log_api_action(
            request=request,
            action='DELETE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to delete a tutor feedback",
            status_code=401,
            entity_type='Tutor_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete a tutor feedback."},
            status=401,
        )

    try:
        # Fetch the existing tutor feedback record
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action='DELETE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message="Tutor feedback not found",
                status_code=404,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse({"error": "Tutor feedback not found."}, status=404)

        # Fetch the related Tutor_Feedback record BEFORE deleting feedback
        tutor_feedback = Tutor_Feedback.objects.filter(feedback=feedback).first()
        if not tutor_feedback:
            log_api_action(
                request=request,
                action='DELETE_TUTOR_FEEDBACK_FAILED',
                success=False,
                error_message="Tutor feedback record not found",
                status_code=404,
                entity_type='Tutor_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse({"error": "Tutor feedback not found."}, status=404)

        # Store data for audit log
        tutor_name = tutor_feedback.tutor_name
        tutee_name = tutor_feedback.tutee_name

        # Delete the related Tutor_Feedback record first
        tutor_feedback.delete()

        # Now delete the tutor feedback record
        feedback.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_TUTOR_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_tutor_feedback'],
            entity_type='Tutor_Feedback',
            entity_ids=[feedback_id],
            success=True,
            additional_data={
                'deleted_tutor_name': tutor_name,
                'deleted_tutee_name': tutee_name
            }
        )

        api_logger.info(f"Tutor feedback with ID {feedback_id} deleted successfully.")
        return JsonResponse(
            {
                "message": "Tutor feedback deleted successfully",
                "feedback_id": feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while deleting the tutor feedback: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_TUTOR_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Tutor_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse({"error": str(e)}, status=500)


# create , update delete for general volunteer feedback and also make sure the volunter_feedback_report which is the GET here  - gives us all the fields tutor feedback report gives on the feedback object
@conditional_csrf
@api_view(["POST"])
def create_volunteer_feedback(request):
    api_logger.info("create_volunteer_feedback called")
    """
    Create a new volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission
    if not has_permission(request, "general_v_feedback", "CREATE"):
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to create a general volunteer feedback",
            status_code=401
        )
        return JsonResponse(
            {
                "error": "You do not have permission to create a general volunteer feedback."
            },
            status=401,
        )

    try:
        data = request.data

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "child_name",
            "volunteer_name",
            "feedback_type",
        ]
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.extend(["hospital_name"])
            required_fields.remove("child_name")
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
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

        staff_filling_id = data.get("staff_id")
        error = None
        initial_family_data = None  # Initialize to None
        
        try:
            feedback = Feedback.objects.create(
                timestamp=data.get("feedback_filled_at"),
                event_date=make_aware(
                    datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
                ),
                staff_id=staff_filling_id,
                description=data.get("description"),
                exceptional_events=(
                    data.get("exceptional_events")
                    if data.get("exceptional_events")
                    else None
                ),
                anything_else=(
                    data.get("anything_else") if data.get("anything_else") else None
                ),
                comments=data.get("comments") if data.get("comments") else None,
                feedback_type=data.get("feedback_type"),
                hospital_name=(
                    data.get("hospital_name") if data.get("hospital_name") else None
                ),
                additional_volunteers=(
                    data.get("additional_volunteers")
                    if data.get("additional_volunteers")
                    else None
                ),
                names=data.get("names") if data.get("names") else None,
                phones=data.get("phones") if data.get("phones") else None,
                other_information=(
                    data.get("other_information")
                    if data.get("other_information")
                    else None
                ),
            )
        except Exception as e:
            error = str(e)
            error_type = "feedback_creation_error"
            api_logger.error(f"Error creating feedback: {error}")

        # Get the volunteer's id_id from General_Volunteer
        api_logger.debug(f"User ID: {user_id}")
        volunteer = General_Volunteer.objects.filter(
            staff_id=staff_filling_id
        ).first()
        api_logger.debug(f"Volunteer found: {volunteer}")
        if not volunteer:
            api_logger.debug(f"No volunteer found for staff ID {staff_filling_id}")
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message="No volunteer found for the provided staff ID",
                status_code=404,
                additional_data={'staff_id': staff_filling_id}
            )
            return JsonResponse(
                {"error": "No volunteer found for the provided staff ID."}, status=404
            )

        if not error:
            try:
                volunteer_feedback = General_V_Feedback.objects.create(
                    feedback=feedback,
                    volunteer_name=data.get("volunteer_name"),
                    volunteer=volunteer,
                    child_name=(
                        data.get("child_name")
                        if data.get("child_name")
                        else "ביקור בבית חולים " + feedback.hospital_name
                    ),
                )
                api_logger.info(
                    f"Volunteer feedback created successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "volunteer_feedback_creation_error"
                api_logger.error(f"Error creating volunteer feedback: {error}")

        if not error:
            try:
                if (
                    data.get("feedback_type") == "general_volunteer_hospital_visit"
                    and data.get("names")
                    and data.get("phones")
                ):
                    initial_family_data = InitialFamilyData.objects.create(
                        names=data["names"],
                        phones=data["phones"],
                        other_information=data.get("other_information", ""),
                    )

                    api_logger.info(
                        f"InitialFamilyData created with ID {initial_family_data.initial_family_data_id}"
                    )
            except Exception as e:
                error = str(e)
                error_type = "initial_family_data_creation_error"
                api_logger.error(
                    f"An error occurred while creating InitialFamilyData: {error}"
                )

        # FIXED: Only create tasks if initial_family_data was actually created
        if not error and initial_family_data is not None:
            try:
                task_type = Task_Types.objects.get(task_type="הוספת משפחה")
                create_tasks_for_technical_coordinators_async(
                    initial_family_data, task_type.id
                )
                api_logger.info("Tasks for Technical Coordinators created successfully.")
            except Exception as e:
                error = str(e)
                error_type = "task_creation_error"
                api_logger.error(f"An error occurred while creating tasks: {error}")

        if error:
            # Clean up on error
            if 'feedback' in locals():
                feedback.delete()
            if "volunteer_feedback" in locals():
                volunteer_feedback.delete()
            if initial_family_data is not None:
                initial_family_data.delete()
            
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message=f"An error occurred while creating volunteer feedback: {error} (Error Type: {error_type})",
                status_code=500,
                additional_data={'error_type': error_type}
            )
            raise Exception(
                f"An error occurred while creating volunteer feedback: {error} (Error Type: {error_type})"
            )

        # Log successful creation
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_general_v_feedback'],
            entity_type='General_V_Feedback',
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                'feedback_type': data.get("feedback_type"),
                'volunteer_name': data.get("volunteer_name"),
                'child_name': data.get("child_name"),
                'event_date': data.get("event_date"),
                'created_family_data': initial_family_data is not None
            }
        )

        return JsonResponse(
            {
                "message": "Volunteer feedback created successfully",
                "feedback_id": feedback.feedback_id,
                "volunteer_feedback_id": volunteer_feedback.feedback_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating volunteer feedback: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def update_volunteer_feedback(request, feedback_id):
    api_logger.info(f"update_volunteer_feedback called for feedback_id: {feedback_id}")
    """
    Update an existing volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "volunteer_feedback" resource
    if not has_permission(request, "general_v_feedback", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to update a volunteer feedback",
            status_code=401,
            entity_type='General_V_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to update a volunteer feedback."},
            status=401,
        )

    try:
        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "child_name",
            "volunteer_name",
            "feedback_type",
        ]
        # Check if we hospital_name is empty if the feedback_type is general_volunteer_hospital_visit - add them to the required fields
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.extend(["hospital_name"])
            # remove child name from the required fields
            required_fields.remove("child_name")
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Update the existing tutor feedback record in the database
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message="Volunteer feedback not found",
                status_code=404,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse(
                {"error": "Volunteer feedback not found."},
                status=404,
            )
        staff_filling_id = data.get("staff_id")

        # Get the volunteer's id_id from General_Volunteer using the user_id (which is staff_id in General_Volunteer)
        volunteer = General_Volunteer.objects.filter(
            staff_id=staff_filling_id
        ).first()  # Fallback to Tutors if not found in General_Volunteer
        api_logger.debug(f"Volunteer found: {volunteer}")  # Log the volunteer found
        if not volunteer:
            api_logger.debug(f"No volunteer found for staff ID {staff_filling_id}")
            log_api_action(
                request=request,
                action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message="No volunteer found for the provided staff ID",
                status_code=404,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id],
                additional_data={'staff_id': staff_filling_id}
            )
            return JsonResponse(
                {"error": "No volunteer found for the provided staff ID."}, status=404
            )

        error = None
        try:
            feedback.timestamp = data.get("feedback_filled_at")
            feedback.event_date = make_aware(
                datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
            )
            feedback.staff_id = staff_filling_id
            feedback.description = data.get("description")
            feedback.exceptional_events = (
                data.get("exceptional_events")
                if data.get("exceptional_events")
                else None
            )
            feedback.anything_else = (
                data.get("anything_else") if data.get("anything_else") else None
            )
            feedback.comments = data.get("comments") if data.get("comments") else None
            feedback.hospital_name = (
                data.get("hospital_name") if data.get("hospital_name") else None
            )
            feedback.additional_volunteers = (
                data.get("additional_volunteers")
                if data.get("additional_volunteers")
                else None
            )
            feedback.names = data.get("names") if data.get("names") else None
            feedback.phones = data.get("phones") if data.get("phones") else None
            feedback.other_information = (
                data.get("other_information") if data.get("other_information") else None
            )
            feedback.save()
        except Exception as e:
            error = str(e)
            error_type = "feedback_update_error"
            api_logger.error(f"Error updating feedback: {error}")

        if not error:
            try:
                volunteer_feedback = General_V_Feedback.objects.filter(
                    feedback=feedback
                ).first()
                if not volunteer_feedback:
                    log_api_action(
                        request=request,
                        action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
                        success=False,
                        error_message="Volunteer feedback record not found",
                        status_code=404,
                        entity_type='General_V_Feedback',
                        entity_ids=[feedback_id]
                    )
                    return JsonResponse(
                        {"error": "Volunteer feedback not found."},
                        status=404,
                    )

                volunteer_feedback.child_name = (
                    data.get("child_name")
                    if data.get("child_name")
                    else "ביקור בבית חולים " + feedback.hospital_name
                )
                volunteer_feedback.volunteer_name = data.get("volunteer_name")
                volunteer_feedback.volunteer = volunteer
                volunteer_feedback.save()
                api_logger.info(
                    f"Volunteer feedback updated successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "volunteer_feedback_update_error"
                api_logger.error(f"Error updating volunteer feedback: {error}")

        if error:
            log_api_action(
                request=request,
                action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message=f"Error updating volunteer feedback: {error} (Error Type: {error_type})",
                status_code=500,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id],
                additional_data={'error_type': error_type}
            )
            return JsonResponse({"error": f"{error_type}: {error}"}, status=500)

        # Log successful update
        log_api_action(
            request=request,
            action='UPDATE_VOLUNTEER_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_general_v_feedback'],
            entity_type='General_V_Feedback',
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                'feedback_type': data.get("feedback_type"),
                'volunteer_name': data.get("volunteer_name"),
                'child_name': data.get("child_name"),
                'event_date': data.get("event_date")
            }
        )

        return JsonResponse(
            {
                "message": "Volunteer feedback updated successfully",
                "feedback_id": feedback.feedback_id,
                "volunteer_feedback_id": volunteer_feedback.feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while updating volunteer feedback: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='General_V_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_volunteer_feedback(request, feedback_id):
    api_logger.info(f"delete_volunteer_feedback called for feedback_id: {feedback_id}")
    """
    Delete a volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "volunteer_feedback" resource
    if not has_permission(request, "general_v_feedback", "DELETE"):
        log_api_action(
            request=request,
            action='DELETE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message="You do not have permission to delete a volunteer feedback",
            status_code=401,
            entity_type='General_V_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse(
            {"error": "You do not have permission to delete a volunteer feedback."},
            status=401,
        )

    try:
        # Fetch the existing volunteer feedback record
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action='DELETE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message="Volunteer feedback not found",
                status_code=404,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse({"error": "Volunteer feedback not found."}, status=404)

        # Fetch the related General_V_Feedback record BEFORE deleting feedback
        volunteer_feedback = General_V_Feedback.objects.filter(
            feedback=feedback
        ).first()
        if not volunteer_feedback:
            log_api_action(
                request=request,
                action='DELETE_VOLUNTEER_FEEDBACK_FAILED',
                success=False,
                error_message="Volunteer feedback record not found",
                status_code=404,
                entity_type='General_V_Feedback',
                entity_ids=[feedback_id]
            )
            return JsonResponse({"error": "Volunteer feedback not found."}, status=404)

        # Store data for audit log
        volunteer_name = volunteer_feedback.volunteer_name
        child_name = volunteer_feedback.child_name

        # Delete the related General_V_Feedback record first
        volunteer_feedback.delete()

        # Now delete the volunteer feedback record
        feedback.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_VOLUNTEER_FEEDBACK_SUCCESS',
            affected_tables=['childsmile_app_feedback', 'childsmile_app_general_v_feedback'],
            entity_type='General_V_Feedback',
            entity_ids=[feedback_id],
            success=True,
            additional_data={
                'deleted_volunteer_name': volunteer_name,
                'deleted_child_name': child_name
            }
        )

        api_logger.info(f"Volunteer feedback with ID {feedback_id} deleted successfully.")
        return JsonResponse(
            {
                "message": "Volunteer feedback deleted successfully",
                "feedback_id": feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while deleting the volunteer feedback: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_VOLUNTEER_FEEDBACK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='General_V_Feedback',
            entity_ids=[feedback_id]
        )
        return JsonResponse({"error": str(e)}, status=500)