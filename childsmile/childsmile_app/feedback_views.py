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
    Feedbacks,
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


# ============================================================================
# UNIFIED FEEDBACK ENDPOINTS
# ----------------------------------------------------------------------------
# Tutor feedback and volunteer feedback were merged into ONE table
# (childsmile_app_feedbacks / models.Feedbacks). Every tutor/volunteer can fill
# ANY feedback type, and the person the feedback is attributed to (the "filler")
# is chosen from a single dropdown of all active tutors + volunteers.
#
#   - request user (staff_id)   = the actual submitter. May be an admin/coordinator
#                                 filling on behalf of someone else ("fill for").
#   - filler_staff_id / filler_name = the tutor/volunteer the feedback is about.
# ============================================================================


def _has_feedback_permission(request, action):
    """
    Unified feedback permission check. A user may act on feedback if they have the
    permission on EITHER legacy resource (``tutor_feedback`` OR ``general_v_feedback``);
    both were historically granted to the same roles, so this preserves access for
    every role that could previously create/view/edit/delete a feedback.
    """
    return has_permission(request, "tutor_feedback", action) or has_permission(
        request, "general_v_feedback", action
    )


@conditional_csrf
@api_view(["POST"])
@block_viewer_writes
def create_feedback(request):
    api_logger.info("create_feedback called")
    """
    Create a new feedback record in the unified feedbacks table.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action="CREATE_FEEDBACK_FAILED",
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    if not _has_feedback_permission(request, "CREATE"):
        log_api_action(
            request=request,
            action="CREATE_FEEDBACK_FAILED",
            success=False,
            error_message="You do not have permission to create a feedback",
            status_code=401,
        )
        return JsonResponse(
            {"error": "You do not have permission to create a feedback."},
            status=401,
        )

    try:
        data = request.data

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "subject_name",
            "filler_name",
            "feedback_type",
        ]
        # Hospital visit has no tutee/child subject; require the hospital name instead.
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.append("hospital_name")
            required_fields.remove("subject_name")
        missing_fields = [
            field for field in required_fields if not str(data.get(field, "")).strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action="CREATE_FEEDBACK_FAILED",
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        staff_submitter_id = data.get("staff_id")
        # The tutor/volunteer the feedback is attributed to. Prefer the person
        # selected in the form; fall back to the submitter (a tutor/volunteer
        # filing their own feedback).
        filler_staff_id = data.get("filler_staff_id") or staff_submitter_id
        error = None
        error_type = None
        initial_family_data = None

        try:
            feedback = Feedbacks.objects.create(
                timestamp=data.get("feedback_filled_at"),
                event_date=make_aware(
                    datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
                ),
                staff_id=staff_submitter_id,
                filler_id=filler_staff_id if filler_staff_id else None,
                filler_name=data.get("filler_name"),
                subject_name=(
                    data.get("subject_name")
                    if data.get("subject_name")
                    else "ביקור בבית חולים " + (data.get("hospital_name") or "")
                ),
                is_it_your_tutee=data.get("is_it_your_tutee"),
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

        # Hospital visit feedback also seeds an InitialFamilyData record + tasks.
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

        # Only create tasks if initial_family_data was actually created
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
            if "feedback" in locals():
                feedback.delete()
            if initial_family_data is not None:
                initial_family_data.delete()

            log_api_action(
                request=request,
                action="CREATE_FEEDBACK_FAILED",
                success=False,
                error_message=f"An error occurred while creating feedback: {error} (Error Type: {error_type})",
                status_code=500,
                additional_data={"error_type": error_type},
            )
            raise Exception(
                f"An error occurred while creating feedback: {error} (Error Type: {error_type})"
            )

        # Log successful creation
        log_api_action(
            request=request,
            action="CREATE_FEEDBACK_SUCCESS",
            affected_tables=["childsmile_app_feedbacks"],
            entity_type="Feedbacks",
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                "feedback_type": data.get("feedback_type"),
                "filler_name": data.get("filler_name"),
                "subject_name": data.get("subject_name"),
                "event_date": data.get("event_date"),
                "created_family_data": initial_family_data is not None,
            },
        )

        return JsonResponse(
            {
                "message": "Feedback created successfully",
                "feedback_id": feedback.feedback_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating feedback: {str(e)}")
        log_api_action(
            request=request,
            action="CREATE_FEEDBACK_FAILED",
            success=False,
            error_message=str(e),
            status_code=500,
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
@block_viewer_writes
def update_feedback(request, feedback_id):
    api_logger.info(f"update_feedback called for feedback_id: {feedback_id}")
    """
    Update an existing feedback record in the unified feedbacks table.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action="UPDATE_FEEDBACK_FAILED",
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    if not _has_feedback_permission(request, "UPDATE"):
        log_api_action(
            request=request,
            action="UPDATE_FEEDBACK_FAILED",
            success=False,
            error_message="You do not have permission to update a feedback",
            status_code=401,
            entity_type="Feedbacks",
            entity_ids=[feedback_id],
        )
        return JsonResponse(
            {"error": "You do not have permission to update a feedback."},
            status=401,
        )

    try:
        data = request.data

        # Validate required fields
        required_fields = [
            "event_date",
            "description",
            "subject_name",
            "filler_name",
            "feedback_type",
        ]
        if data.get("feedback_type") == "general_volunteer_hospital_visit":
            required_fields.append("hospital_name")
            required_fields.remove("subject_name")
        missing_fields = [
            field for field in required_fields if not str(data.get(field, "")).strip()
        ]
        if missing_fields:
            log_api_action(
                request=request,
                action="UPDATE_FEEDBACK_FAILED",
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400,
                entity_type="Feedbacks",
                entity_ids=[feedback_id],
            )
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        feedback = Feedbacks.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action="UPDATE_FEEDBACK_FAILED",
                success=False,
                error_message="Feedback not found",
                status_code=404,
                entity_type="Feedbacks",
                entity_ids=[feedback_id],
            )
            return JsonResponse({"error": "Feedback not found."}, status=404)

        staff_submitter_id = data.get("staff_id")
        filler_staff_id = data.get("filler_staff_id") or staff_submitter_id

        error = None
        error_type = None
        try:
            feedback.timestamp = data.get("feedback_filled_at")
            feedback.event_date = make_aware(
                datetime.datetime.strptime(data.get("event_date"), "%Y-%m-%d")
            )
            feedback.staff_id = staff_submitter_id
            feedback.filler_id = filler_staff_id if filler_staff_id else None
            feedback.filler_name = data.get("filler_name")
            feedback.subject_name = (
                data.get("subject_name")
                if data.get("subject_name")
                else "ביקור בבית חולים " + (data.get("hospital_name") or "")
            )
            feedback.is_it_your_tutee = data.get("is_it_your_tutee")
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

        if error:
            log_api_action(
                request=request,
                action="UPDATE_FEEDBACK_FAILED",
                success=False,
                error_message=f"Error updating feedback: {error} (Error Type: {error_type})",
                status_code=500,
                entity_type="Feedbacks",
                entity_ids=[feedback_id],
                additional_data={"error_type": error_type},
            )
            return JsonResponse({"error": f"{error_type}: {error}"}, status=500)

        # Log successful update
        log_api_action(
            request=request,
            action="UPDATE_FEEDBACK_SUCCESS",
            affected_tables=["childsmile_app_feedbacks"],
            entity_type="Feedbacks",
            entity_ids=[feedback.feedback_id],
            success=True,
            additional_data={
                "feedback_type": data.get("feedback_type"),
                "filler_name": data.get("filler_name"),
                "subject_name": data.get("subject_name"),
                "event_date": data.get("event_date"),
            },
        )

        return JsonResponse(
            {
                "message": "Feedback updated successfully",
                "feedback_id": feedback.feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while updating feedback: {str(e)}")
        log_api_action(
            request=request,
            action="UPDATE_FEEDBACK_FAILED",
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type="Feedbacks",
            entity_ids=[feedback_id],
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
@block_viewer_writes
def delete_feedback(request, feedback_id):
    api_logger.info(f"delete_feedback called for feedback_id: {feedback_id}")
    """
    Delete a feedback record from the unified feedbacks table.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action="DELETE_FEEDBACK_FAILED",
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403,
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    if not _has_feedback_permission(request, "DELETE"):
        log_api_action(
            request=request,
            action="DELETE_FEEDBACK_FAILED",
            success=False,
            error_message="You do not have permission to delete a feedback",
            status_code=401,
            entity_type="Feedbacks",
            entity_ids=[feedback_id],
        )
        return JsonResponse(
            {"error": "You do not have permission to delete a feedback."},
            status=401,
        )

    try:
        feedback = Feedbacks.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            log_api_action(
                request=request,
                action="DELETE_FEEDBACK_FAILED",
                success=False,
                error_message="Feedback not found",
                status_code=404,
                entity_type="Feedbacks",
                entity_ids=[feedback_id],
            )
            return JsonResponse({"error": "Feedback not found."}, status=404)

        # Store data for audit log
        filler_name = feedback.filler_name
        subject_name = feedback.subject_name

        feedback.delete()

        # Log successful deletion
        log_api_action(
            request=request,
            action="DELETE_FEEDBACK_SUCCESS",
            affected_tables=["childsmile_app_feedbacks"],
            entity_type="Feedbacks",
            entity_ids=[feedback_id],
            success=True,
            additional_data={
                "deleted_filler_name": filler_name,
                "deleted_subject_name": subject_name,
            },
        )

        api_logger.info(f"Feedback with ID {feedback_id} deleted successfully.")
        return JsonResponse(
            {
                "message": "Feedback deleted successfully",
                "feedback_id": feedback_id,
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while deleting the feedback: {str(e)}")
        log_api_action(
            request=request,
            action="DELETE_FEEDBACK_FAILED",
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type="Feedbacks",
            entity_ids=[feedback_id],
        )
        return JsonResponse({"error": str(e)}, status=500)
