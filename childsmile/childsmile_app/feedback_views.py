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
    Healthy,
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
    HealthyViewSet,
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
def create_tutor_feedback(request):
    """
    Create a new tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "CREATE"):
        return JsonResponse(
            {"error": "You do not have permission to create a tutor feedback."},
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
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        staff_filling_id = data.get("staff_id")
        # Create a new tutor feedback record in the database
        error = None
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
            print(f"DEBUG: Error creating feedback: {error}")  # Log the error

        # Get the tutor's id_id from Tutors using the user_id (which is staff_id in Tutors)
        print(f"DEBUG: User ID: {user_id}")  # Log the user ID
        tutor = Tutors.objects.filter(staff_id=staff_filling_id).first()
        print(f"DEBUG: Tutor found: {tutor}")  # Log the tutor found
        if not tutor:
            print(f"DEBUG: No tutor found for staff ID {staff_filling_id}")
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

                print(
                    f"DEBUG: Tutor feedback created successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "tutor_feedback_creation_error"
                print(
                    f"DEBUG: An error occurred while creating tutor feedback: {error}"
                )

        if not error:
            try:
                if (
                    data.get("feedback_type") == "general_volunteer_hospital_visit"
                    and data.get("names")
                    and data.get("phones")
                ):
                    # Create InitialFamilyData
                    initial_family_data = InitialFamilyData.objects.create(
                        names=data["names"],
                        phones=data["phones"],
                        other_information=data.get("other_information", ""),
                    )

                    print(
                        f"DEBUG: InitialFamilyData created with ID {initial_family_data.initial_family_data_id}"
                    )
            except Exception as e:
                error = str(e)
                error_type = "initial_family_data_creation_error"
                print(
                    f"DEBUG: An error occurred while creating InitialFamilyData: {error}"
                )

        if not error:
            try:
                # Get the task type id for "הוספת משפחה"
                task_type = Task_Types.objects.get(task_type="הוספת משפחה")
                # Create tasks for all Technical Coordinators
                create_tasks_for_technical_coordinators_async(
                    initial_family_data, task_type.id
                )
                print("DEBUG: Tasks for Technical Coordinators created successfully.")
            except Exception as e:
                error = str(e)
                error_type = "task_creation_error"
                print(
                    f"DEBUG: An error occurred while creating tasks for Technical Coordinators: {error}"
                )

        if error:
            # If any error occurred, delete the created feedback and tutor_feedback
            feedback.delete()
            if "tutor_feedback" in locals():
                tutor_feedback.delete()
            if "initial_family_data" in locals():
                initial_family_data.delete()
            raise Exception(
                f"An error occurred while creating tutor feedback: {error} (Error Type: {error_type})"
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
        print(f"DEBUG: An error occurred while creating tutor feedback: {str(e)}")
        return JsonResponse({"error": error_type + ": " + str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_tutor_feedback(request, feedback_id):
    """
    Update an existing tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "UPDATE"):
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
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Update the existing tutor feedback record in the database
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            return JsonResponse(
                {"error": "Tutor feedback not found."},
                status=404,
            )
        staff_filling_id = data.get("staff_id")
        # Get the tutor's id_id from Tutors using the user_id (which is staff_id in Tutors)
        tutor = Tutors.objects.filter(staff_id=staff_filling_id).first()
        print(f"DEBUG: Tutor found: {tutor}")  # Log the tutor found
        if not tutor:
            print(f"DEBUG: No tutor found for staff ID {staff_filling_id}")
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
            print(f"DEBUG: Error updating feedback: {error}")

        tutor_id_id = tutor.id_id

        if not error:
            try:
                tutor_feedback = Tutor_Feedback.objects.filter(
                    feedback=feedback
                ).first()
                if not tutor_feedback:
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

                print(
                    f"DEBUG: Tutor feedback updated successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "tutor_feedback_update_error"
                print(
                    f"DEBUG: An error occurred while updating tutor feedback: {error}"
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
        print(f"DEBUG: An error occurred while updating tutor feedback: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_tutor_feedback(request, feedback_id):
    """
    Delete a tutor feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "DELETE"):
        return JsonResponse(
            {"error": "You do not have permission to delete a tutor feedback."},
            status=401,
        )

    try:
        # Fetch the existing tutor feedback record
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            return JsonResponse({"error": "Tutor feedback not found."}, status=404)

        # Fetch the related Tutor_Feedback record BEFORE deleting feedback
        tutor_feedback = Tutor_Feedback.objects.filter(feedback=feedback).first()
        if not tutor_feedback:
            return JsonResponse({"error": "Tutor feedback not found."}, status=404)

        # Delete the related Tutor_Feedback record first
        tutor_feedback.delete()

        # Now delete the tutor feedback record
        feedback.delete()

        print(f"DEBUG: Tutor feedback with ID {feedback_id} deleted successfully.")
        return JsonResponse(
            {
                "message": "Tutor feedback deleted successfully",
                "feedback_id": feedback_id,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting the tutor feedback: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


# create , update delete for general volunteer feedback and also make sure the volunter_feedback_report which is the GET here  - gives us all the fields tutor feedback report gives on the feedback object
@csrf_exempt
@api_view(["POST"])
def create_volunteer_feedback(request):
    """
    Create a new volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "volunteer_feedback" resource
    if not has_permission(request, "general_v_feedback", "CREATE"):
        return JsonResponse(
            {
                "error": "You do not have permission to create a general volunteer feedback."
            },
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
            # remove volunteer name from the required fields
            required_fields.remove("child_name")
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

        staff_filling_id = data.get("staff_id")
        # Create a new tutor feedback record in the database
        error = None
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
            print(f"DEBUG: Error creating feedback: {error}")

        # Get the volunteer's id_id from General_Volunteer using the user_id (which is staff_id in General_Volunteer)
        print(f"DEBUG: User ID: {user_id}")  # Log the user ID
        volunteer = General_Volunteer.objects.filter(
            staff_id=staff_filling_id
        ).first()  # Fallback to Tutors if not found in General_Volunteer
        print(f"DEBUG: Volunteer found: {volunteer}")  # Log the volunteer found
        if not volunteer:
            print(f"DEBUG: No volunteer found for staff ID {staff_filling_id}")
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
                print(
                    f"DEBUG: Volunteer feedback created successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "volunteer_feedback_creation_error"
                print(f"DEBUG: Error creating volunteer feedback: {error}")

        if not error:
            try:
                if (
                    data.get("feedback_type") == "general_volunteer_hospital_visit"
                    and data.get("names")
                    and data.get("phones")
                ):
                    # Create InitialFamilyData
                    initial_family_data = InitialFamilyData.objects.create(
                        names=data["names"],
                        phones=data["phones"],
                        other_information=data.get("other_information", ""),
                    )

                    print(
                        f"DEBUG: InitialFamilyData created with ID {initial_family_data.initial_family_data_id}"
                    )
            except Exception as e:
                error = str(e)
                error_type = "initial_family_data_creation_error"
                print(
                    f"DEBUG: An error occurred while creating InitialFamilyData: {error}"
                )
        if not error:
            try:
                # Get the task type id for "הוספת משפחה"
                task_type = Task_Types.objects.get(task_type="הוספת משפחה")
                # Create tasks for all Technical Coordinators
                create_tasks_for_technical_coordinators_async(
                    initial_family_data, task_type.id
                )
                print("DEBUG: Tasks for Technical Coordinators created successfully.")
            except Exception as e:
                error = str(e)
                error_type = "task_creation_error"
                print(f"DEBUG: An error occurred while creating tasks: {error}")

        if error:
            # If any error occurred, delete the created feedback and volunteer_feedback
            feedback.delete()
            if "volunteer_feedback" in locals():
                volunteer_feedback.delete()
            if "initial_family_data" in locals():
                initial_family_data.delete()
            raise Exception(
                f"An error occurred while creating volunteer feedback: {error} (Error Type: {error_type})"
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
        print(f"DEBUG: An error occurred while creating volunteer feedback: {str(e)}")
        return JsonResponse({"error": error_type + ": " + str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_volunteer_feedback(request, feedback_id):
    """
    Update an existing volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "volunteer_feedback" resource
    if not has_permission(request, "general_v_feedback", "UPDATE"):
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
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Update the existing tutor feedback record in the database
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            return JsonResponse(
                {"error": "Volunteer feedback not found."},
                status=404,
            )
        staff_filling_id = data.get("staff_id")

        # Get the volunteer's id_id from General_Volunteer using the user_id (which is staff_id in General_Volunteer)
        volunteer = General_Volunteer.objects.filter(
            staff_id=staff_filling_id
        ).first()  # Fallback to Tutors if not found in General_Volunteer
        print(f"DEBUG: Volunteer found: {volunteer}")  # Log the volunteer found
        if not volunteer:
            print(f"DEBUG: No volunteer found for staff ID {staff_filling_id}")
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
            print(f"DEBUG: Error updating feedback: {error}")

        if not error:
            try:
                volunteer_feedback = General_V_Feedback.objects.filter(
                    feedback=feedback
                ).first()
                if not volunteer_feedback:
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
                print(
                    f"DEBUG: Volunteer feedback updated successfully with ID {feedback.feedback_id}"
                )
            except Exception as e:
                error = str(e)
                error_type = "volunteer_feedback_update_error"
                print(f"DEBUG: Error updating volunteer feedback: {error}")

        return JsonResponse(
            {
                "message": "Volunteer feedback updated successfully",
                "feedback_id": feedback.feedback_id,
                "volunteer_feedback_id": volunteer_feedback.feedback_id,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating volunteer feedback: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_volunteer_feedback(request, feedback_id):
    """
    Delete a volunteer feedback record.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "volunteer_feedback" resource
    if not has_permission(request, "general_v_feedback", "DELETE"):
        return JsonResponse(
            {"error": "You do not have permission to delete a volunteer feedback."},
            status=401,
        )

    try:
        # Fetch the existing volunteer feedback record
        feedback = Feedback.objects.filter(feedback_id=feedback_id).first()
        if not feedback:
            return JsonResponse({"error": "Volunteer feedback not found."}, status=404)

        # Fetch the related General_V_Feedback record BEFORE deleting feedback
        volunteer_feedback = General_V_Feedback.objects.filter(
            feedback=feedback
        ).first()
        if not volunteer_feedback:
            return JsonResponse({"error": "Volunteer feedback not found."}, status=404)

        # Delete the related General_V_Feedback record first
        volunteer_feedback.delete()

        # Now delete the volunteer feedback record
        feedback.delete()

        print(f"DEBUG: Volunteer feedback with ID {feedback_id} deleted successfully.")
        return JsonResponse(
            {
                "message": "Volunteer feedback deleted successfully",
                "feedback_id": feedback_id,
            },
            status=200,
        )
    except Exception as e:
        print(
            f"DEBUG: An error occurred while deleting the volunteer feedback: {str(e)}"
        )
        return JsonResponse({"error": str(e)}, status=500)