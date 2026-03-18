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
from django.db.models import Q
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
from .logger import api_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@conditional_csrf
@api_view(["GET"])
def get_families_per_location_report(request):
    api_logger.info("get_families_per_location_report called")
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    if not has_permission(request, "children", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to generate this report"}, status=401
        )

    try:
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        if from_date:
            from_date = make_aware(datetime.datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.datetime.strptime(to_date, "%Y-%m-%d"))

        children = Children.objects.all()
        if from_date:
            children = children.filter(registrationdate__gte=from_date)
        if to_date:
            children = children.filter(registrationdate__lte=to_date)

        children_data = []
        for child in children:
            location = get_or_update_city_location(
                child.city
            )  # Use the helper function
            
            # Handle case where location is None (geocoding API unavailable or city not found)
            if location is None:
                location = {"latitude": None, "longitude": None}
            
            children_data.append(
                {
                    "first_name": child.childfirstname,
                    "last_name": child.childsurname,
                    "city": child.city,
                    "latitude": location["latitude"],
                    "longitude": location["longitude"],
                    "registration_date": child.registrationdate.strftime("%d/%m/%Y"),
                }
            )

        return JsonResponse({"families_per_location": children_data}, status=200)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def families_waiting_for_tutorship_report(request):
    api_logger.info("families_waiting_for_tutorship_report called")
    """
    Retrieve a report of families waiting for tutorship (including those with existing tutors).
    
    MULTI-TUTOR SUPPORT: This report now includes:
    - Families with waiting status (לא מכולא חונך yet)
    - Families with pending tutorships
    - Families with ACTIVE tutors who want additional tutors (יש_חונך status)
    
    This allows the NPO to add MORE tutors to families that already have one.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "children" resource
    if not has_permission(request, "children", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to generate this report"}, status=401
        )

    try:
        # Define the tutoring statuses that indicate waiting for tutorship
        # MULTI-TUTOR: Now includes יש_חונך (has tutor) so we can add more tutors
        waiting_statuses = [
            "למצוא_חונך",                 # Looking for tutor (no tutor yet)
            "למצוא_חונך_אין_באיזור_שלו",  # Looking, none in area
            "למצוא_חונך_בעדיפות_גבוה",    # Looking, high priority
            "יש_חונך",                    # HAS tutor - but may want MORE (multi-tutor)
            "שידוך_בסימן_שאלה",           # Matched but not sure if it will work
        ]

        # Get date filters from query parameters
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        # Convert from_date and to_date to timezone-aware datetimes
        if from_date:
            from_date = make_aware(datetime.datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.datetime.strptime(to_date, "%Y-%m-%d"))

        # MULTI-TUTOR: Fetch children that:
        # 1. Have waiting status (with or without tutors) 
        # 2. Have pending tutorships
        # Exclude ONLY those with non-tutoring statuses (לא רוצים, לא רלוונטי, בוגר)
        # Exclude deceased children
        excluded_tutoring_statuses = ['לא_רוצים', 'לא_רלוונטי', 'בוגר']  # Adjust as needed
        excluded_statuses = ['ז״ל', 'עזב']  # Exclude deceased and left children

        children = Children.objects.filter(
            Q(tutoring_status__in=waiting_statuses) |  # Children with waiting/tutor status
            Q(tutorships__tutorship_activation='pending_first_approval')  # OR children with pending tutorships
        ).exclude(
            tutoring_status__in=excluded_tutoring_statuses  # Exclude non-tutoring statuses
        ).exclude(
            status__in=excluded_statuses # Exclude deceased children
        ).distinct()

        # Apply date filters if provided
        if from_date:
            children = children.filter(registrationdate__gte=from_date)
        if to_date:
            children = children.filter(registrationdate__lte=to_date)

        children = children.order_by("registrationdate").values(
            "child_id",
            "childfirstname",
            "childsurname",
            "father_name",
            "father_phone",
            "mother_name",
            "mother_phone",
            "tutoring_status",
            "registrationdate",
        )

        # Prepare the data
        children_data = [
            {
                "child_id": child["child_id"],
                "first_name": child["childfirstname"],  # Access using dictionary keys
                "last_name": child["childsurname"],
                "father_name": child["father_name"],
                "father_phone": child["father_phone"],
                "mother_name": child["mother_name"],
                "mother_phone": child["mother_phone"],
                "tutoring_status": child["tutoring_status"],
                "registration_date": child["registrationdate"].strftime("%d/%m/%Y"),
            }
            for child in children
        ]

        # Return the data as JSON
        return JsonResponse(
            {"families_waiting_for_tutorship": children_data}, status=200
        )
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_new_families_report(request):
    api_logger.info("get_new_families_report called")
    """
    Retrieve a report of new families with child and parent details, filtered by registration date.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "children" resource
    if not has_permission(request, "children", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to generate this report"}, status=401
        )

    try:
        # Calculate the date for one month ago
        one_month_ago = make_aware(
            datetime.datetime.now() - datetime.timedelta(days=30)
        )

        # Get date filters from query parameters
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        # Convert from_date and to_date to timezone-aware datetimes
        if from_date:
            from_date = make_aware(datetime.datetime.strptime(from_date, "%Y-%m-%d"))
            # Ensure from_date is not older than one month ago
            if from_date < one_month_ago:
                from_date = one_month_ago
        else:
            from_date = one_month_ago  # Default to one month ago if not provided

        if to_date:
            to_date = make_aware(datetime.datetime.strptime(to_date, "%Y-%m-%d"))
        else:
            to_date = make_aware(datetime.datetime.now())  # Default to the current date

        # Fetch children registered within the specified date range
        children = Children.objects.filter(
            registrationdate__gte=from_date, registrationdate__lte=to_date
        ).values(
            "childfirstname",
            "childsurname",
            "father_name",
            "father_phone",
            "mother_name",
            "mother_phone",
            "registrationdate",
        )

        # Prepare the data
        children_data = [
            {
                "child_firstname": child["childfirstname"],
                "child_lastname": child["childsurname"],
                "father_name": child["father_name"],
                "father_phone": child["father_phone"],
                "mother_name": child["mother_name"],
                "mother_phone": child["mother_phone"],
                "registration_date": child["registrationdate"].strftime("%d/%m/%Y"),
            }
            for child in children
        ]

        # Return the data as JSON
        return JsonResponse({"new_families": children_data}, status=200)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def active_tutors_report(request):
    api_logger.info("active_tutors_report called")
    """
    Retrieve a report of active tutors with their assigned children, filtered by date range.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "tutorships" resource
    if not has_permission(request, "tutorships", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    try:
        # Get date filters from query parameters
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        # Convert from_date and to_date to timezone-aware datetimes
        if from_date:
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))

        # Base queryset
        tutorships = Tutorships.objects.select_related("child", "tutor__staff").filter(
            tutor__staff__is_active=True
        ).values(
            "child__childfirstname",
            "child__childsurname",
            "tutor__staff__first_name",
            "tutor__staff__last_name",
            "created_date",
        )

        # Apply date filters if provided
        if from_date:
            tutorships = tutorships.filter(created_date__gte=from_date)
        if to_date:
            tutorships = tutorships.filter(created_date__lte=to_date)

        # Prepare the data
        active_tutors_data = [
            {
                "child_firstname": tutorship["child__childfirstname"],
                "child_lastname": tutorship["child__childsurname"],
                "tutor_firstname": tutorship["tutor__staff__first_name"],
                "tutor_lastname": tutorship["tutor__staff__last_name"],
                "created_date": tutorship["created_date"].strftime("%d/%m/%Y"),
            }
            for tutorship in tutorships
        ]

        # Return the data as JSON
        return JsonResponse({"active_tutors": active_tutors_data}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def possible_tutorship_matches_report(request):
    api_logger.info("possible_tutorship_matches_report called")
    """
    Retrieve a report of all possible tutorship matches.
    Refreshes tutor and children ages before returning data.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "possiblematches" resource
    if not has_permission(request, "possiblematches", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    try:
        # Refresh all ages (tutors and children) before returning report data
        from .utils import refresh_all_ages_for_matching, format_date_to_string
        age_refresh_result = refresh_all_ages_for_matching()
        api_logger.debug(f"Ages refreshed for matches report - tutors: {age_refresh_result['tutors_updated']}, children: {age_refresh_result['children_updated']}")
        
        # Fetch all data from the PossibleMatches table
        possible_matches = PossibleMatches.objects.all()

        # Enrich with birth_date from source tables
        possible_matches_data = []
        for match in possible_matches:
            match_dict = {
                'match_id': match.match_id,
                'child_id': match.child_id,
                'tutor_id': match.tutor_id,
                'child_full_name': match.child_full_name,
                'tutor_full_name': match.tutor_full_name,
                'child_city': match.child_city,
                'tutor_city': match.tutor_city,
                'child_age': match.child_age,
                'tutor_age': match.tutor_age,
                'child_gender': match.child_gender,
                'tutor_gender': match.tutor_gender,
                'distance_between_cities': match.distance_between_cities,
                'grade': match.grade,
                'is_used': match.is_used,
            }
            
            # Get child birth_date from Children table
            try:
                child = Children.objects.filter(child_id=match.child_id).first()
                if child and child.birthday:
                    match_dict['child_birth_date'] = format_date_to_string(child.birthday)
                else:
                    match_dict['child_birth_date'] = None
            except Exception:
                match_dict['child_birth_date'] = None
            
            # Get tutor birth_date from SignedUp table
            try:
                tutor = SignedUp.objects.filter(id=match.tutor_id).first()
                if tutor and tutor.birth_date:
                    match_dict['tutor_birth_date'] = format_date_to_string(tutor.birth_date)
                else:
                    match_dict['tutor_birth_date'] = None
            except Exception:
                match_dict['tutor_birth_date'] = None
            
            possible_matches_data.append(match_dict)
        
        api_logger.debug(f"Possible matches data: {possible_matches_data}")

        # Return the data as JSON
        return JsonResponse(
            {"possible_tutorship_matches": possible_matches_data}, status=200
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# next report is volunteer feedback report@conditional_csrf
@api_view(["GET"])
def volunteer_feedback_report(request):
    api_logger.info("volunteer_feedback_report called")
    """
    Retrieve a report of all volunteer feedback and all the corresponding feedbacks from the feedback table.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "general_v_feedback" resource
    if not has_permission(request, "general_v_feedback", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    try:
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        if from_date:
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))

        # Fetch all feedbacks with related feedback data
        feedbacks = General_V_Feedback.objects.select_related("feedback").all()

        # Apply date filters if provided
        if from_date:
            feedbacks = feedbacks.filter(feedback__timestamp__gte=from_date)
        if to_date:
            feedbacks = feedbacks.filter(feedback__timestamp__lte=to_date)

        # Convert the data to a list of dictionaries
        feedbacks_data = []
        for feedback in feedbacks:
            try:
                feedbacks_data.append(
                    {
                        "volunteer_name": feedback.volunteer_name,
                        "volunteer_id": feedback.volunteer_id,
                        "child_name": feedback.child_name,
                        "feedback_id": feedback.feedback.feedback_id,  # Access the related Feedback table
                        "event_date": feedback.feedback.event_date.strftime("%d/%m/%Y"),
                        "feedback_filled_at": feedback.feedback.timestamp.strftime(
                            "%d/%m/%Y"
                        ),
                        "description": feedback.feedback.description,
                        "exceptional_events": feedback.feedback.exceptional_events,
                        "anything_else": feedback.feedback.anything_else,
                        "comments": feedback.feedback.comments,
                        "feedback_type": feedback.feedback.feedback_type,
                        "hospital_name": feedback.feedback.hospital_name,
                        "additional_volunteers": feedback.feedback.additional_volunteers,
                        "names": feedback.feedback.names,
                        "phones": feedback.feedback.phones,
                        "other_information": feedback.feedback.other_information,
                    }
                )
            except Exception as e:
                api_logger.error(f"Error processing feedback: {feedback}, Error: {str(e)}")

        # Return the data as JSON
        return JsonResponse({"volunteer_feedback": feedbacks_data}, status=200)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


# next report is tutor feedback report
@conditional_csrf
@api_view(["GET"])
def tutor_feedback_report(request):
    api_logger.info("tutor_feedback_report called")
    """
    Retrieve a report of all tutor feedback.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "tutor_feedback" resource
    if not has_permission(request, "tutor_feedback", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    try:
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        if from_date:
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))

        # Fetch all feedbacks with related feedback data
        feedbacks = Tutor_Feedback.objects.select_related("feedback").all()

        # Apply date filters if provided
        if from_date:
            feedbacks = feedbacks.filter(feedback__timestamp__gte=from_date)
        if to_date:
            feedbacks = feedbacks.filter(feedback__timestamp__lte=to_date)

        # Convert the data to a list of dictionaries
        feedbacks_data = []
        for feedback in feedbacks:
            try:
                feedbacks_data.append(
                    {
                        "tutor_name": feedback.tutor_name,
                        "tutee_name": feedback.tutee_name,
                        "is_it_your_tutee": feedback.is_it_your_tutee,
                        "is_first_visit": feedback.is_first_visit,
                        "feedback_id": feedback.feedback.feedback_id,
                        "event_date": feedback.feedback.event_date.strftime("%d/%m/%Y"),
                        "feedback_filled_at": feedback.feedback.timestamp.strftime(
                            "%d/%m/%Y"
                        ),
                        "description": feedback.feedback.description,
                        "exceptional_events": feedback.feedback.exceptional_events,
                        "anything_else": feedback.feedback.anything_else,
                        "comments": feedback.feedback.comments,
                        "feedback_type": feedback.feedback.feedback_type,
                        "hospital_name": feedback.feedback.hospital_name,
                        "additional_volunteers": feedback.feedback.additional_volunteers,
                        "names": feedback.feedback.names,
                        "phones": feedback.feedback.phones,
                        "other_information": feedback.feedback.other_information,
                    }
                )
            except Exception as e:
                api_logger.error(f"Error processing feedback: {feedback}, Error: {str(e)}")

        # Return the data as JSON
        return JsonResponse({"tutor_feedback": feedbacks_data}, status=200)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def families_tutorships_stats(request):
    api_logger.info("families_tutorships_stats called")
    """
    Get statistics about families with tutorships and those waiting for one.
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

    # Families with tutorship
    with_tutorship = (
        Children.objects.filter(tutorships__isnull=False).distinct().count()
    )
    # Families waiting (adjust status as needed)
    waiting_statuses = [
        "למצוא_חונך",
        "למצוא_חונך_אין_באיזור_שלו",
        "למצוא_חונך_בעדיפות_גבוה",
    ]
    waiting = Children.objects.filter(tutoring_status__in=waiting_statuses).count()
    return JsonResponse(
        {
            "with_tutorship": with_tutorship,
            "waiting": waiting,
        }
    )


@conditional_csrf
@api_view(["GET"])
def pending_tutors_stats(request):
    api_logger.info("pending_tutors_stats called")
    """
    Get statistics about pending tutors vs all tutors.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "tutors" resource
    if not has_permission(request, "tutors", "VIEW") or not has_permission(
        request, "pending_tutor", "VIEW"
    ):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    total_tutors = Tutors.objects.count()
    pending_tutors = Pending_Tutor.objects.count()

    percent_pending = (pending_tutors / total_tutors * 100) if total_tutors > 0 else 0

    return JsonResponse(
        {
            "total_tutors": total_tutors,
            "pending_tutors": pending_tutors,
            "percent_pending": round(percent_pending, 2),
        }
    )


@conditional_csrf
@api_view(["GET"])
def roles_spread_stats(request):
    api_logger.info("roles_spread_stats called")
    """
    Get count of staff members per role.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Allow only if user is admin
    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        return JsonResponse(
            {"error": "You do not have permission to view this report."}, status=401
        )

    # Count staff per role using the correct related_name 'staff_members'
    role_counts = Role.objects.annotate(count=Count("staff_members")).values(
        name=F("role_name"), count=F("count")
    )

    return JsonResponse({"roles": list(role_counts)})


@conditional_csrf
@api_view(["GET"])
def get_all_volunteers_irs_report(request):
    """
    Get ALL volunteers with UNIQUE volunteer data only for IRS export.
    Returns all registered volunteers unified in one list - no type differentiation.
    CRITICAL: For Israeli IRS compliance - includes volunteer core data from SignedUp + role-specific fields.
    
    Core fields (from SignedUp): id, first_name, surname, age, birth_date, gender, phone, city, email, comment, want_tutor
    Tutor-specific: tutorship_status, preferences
    General_Volunteer-specific: signupdate, comments
    Pending_Tutor-specific: pending_status
    
    NO DUPLICATES: No staff references, no related child data, no redundant timestamps
    """
    
    def _merge_volunteer_records(existing, new):
        """Merge volunteer records by filling empty values with non-empty ones and keeping most recent status"""
        for key, value in new.items():
            if key == "status":
                # Status will be set based on most recent record's created_at timestamp
                # This is handled by tracking signupdate (created_at)
                pass
            elif not existing.get(key) and value:
                # If existing value is empty and new value is not, use new value
                existing[key] = value
    
    def _get_most_recent_status(existing, new, existing_date, new_date):
        """Get status from the most recently created record"""
        if not existing_date or not new_date:
            # If no dates, keep existing
            return existing.get("status", "עזב")
        
        # Convert string dates back to comparable format, or use signupdate
        # The most recent signup should determine current status
        try:
            # signupdate is in format dd/mm/yyyy, parse it
            from datetime import datetime
            existing_dt = datetime.strptime(existing_date, '%d/%m/%Y')
            new_dt = datetime.strptime(new_date, '%d/%m/%Y')
            
            # Use the most recent date's status
            if new_dt >= existing_dt:
                return new.get("status", "עזב")
            else:
                return existing.get("status", "עזב")
        except:
            # If date parsing fails, keep existing
            return existing.get("status", "עזב")
    
    api_logger.info("get_all_volunteers_irs_report called")
    user_id = request.session.get("user_id")
    
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    if not has_permission(request, "staff", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to generate this report"}, status=401
        )

    try:
        # Use dictionary to track volunteers by email to avoid duplicates
        # If same email appears multiple times, merge all non-null values
        volunteers_by_email = {}

        # Get all tutors - extract UNIQUE data from SignedUp + Tutors table
        tutors = Tutors.objects.select_related('id', 'staff').all()
        for tutor in tutors:
            # Convert gender boolean to readable string (True = Female/נקבה, False = Male/זכר)
            gender_str = "נקבה" if tutor.id.gender else "זכר"
            # Convert active status to Hebrew (True = פעיל, False = עזב)
            active_str = "פעיל" if tutor.staff.is_active else "עזב"
            
            email = tutor.id.email or ""
            volunteer_record = {
                # SignedUp table fields - CORE 10 fields
                "volunteer_id": tutor.id.id,
                "first_name": tutor.id.first_name,
                "last_name": tutor.id.surname,
                "age": tutor.id.age,
                "birth_date": tutor.id.birth_date.strftime('%d/%m/%Y') if tutor.id.birth_date else "",
                "gender": gender_str,
                "phone": tutor.id.phone,
                "city": tutor.id.city,
                "email": email,
                "want_tutor": "כן" if tutor.id.want_tutor else "לא",
                
                # Tutor-specific UNIQUE fields
                "signupdate": tutor.staff.created_at.strftime('%d/%m/%Y') if tutor.staff and tutor.staff.created_at else "",
                "status": active_str,
            }
            if email not in volunteers_by_email:
                volunteers_by_email[email] = volunteer_record
            else:
                # Merge: fill in empty values with new data
                _merge_volunteer_records(volunteers_by_email[email], volunteer_record)
                # Use most recent status based on signupdate
                volunteers_by_email[email]["status"] = _get_most_recent_status(
                    volunteers_by_email[email], volunteer_record,
                    volunteers_by_email[email].get("signupdate", ""),
                    volunteer_record.get("signupdate", "")
                )

        # Get all general volunteers - extract UNIQUE data from SignedUp + General_Volunteer table
        general_volunteers = General_Volunteer.objects.select_related('id', 'staff').all()
        for volunteer in general_volunteers:
            # Convert gender boolean to readable string (True = Female/נקבה, False = Male/זכר)
            gender_str = "נקבה" if volunteer.id.gender else "זכר"
            # Convert active status to Hebrew (True = פעיל, False = עזב)
            active_str = "פעיל" if volunteer.staff.is_active else "עזב"
            
            email = volunteer.id.email or ""
            volunteer_record = {
                # SignedUp table fields - CORE 10 fields
                "volunteer_id": volunteer.id.id,
                "first_name": volunteer.id.first_name,
                "last_name": volunteer.id.surname,
                "age": volunteer.id.age,
                "birth_date": volunteer.id.birth_date.strftime('%d/%m/%Y') if volunteer.id.birth_date else "",
                "gender": gender_str,
                "phone": volunteer.id.phone,
                "city": volunteer.id.city,
                "email": email,
                "want_tutor": "כן" if volunteer.id.want_tutor else "לא",
                
                # General Volunteer-specific UNIQUE fields
                "signupdate": volunteer.signupdate.strftime('%d/%m/%Y') if volunteer.signupdate else "",
                "status": active_str,
            }
            if email not in volunteers_by_email:
                volunteers_by_email[email] = volunteer_record
            else:
                # Merge: fill in empty values with new data
                _merge_volunteer_records(volunteers_by_email[email], volunteer_record)
                # Use most recent status based on signupdate
                volunteers_by_email[email]["status"] = _get_most_recent_status(
                    volunteers_by_email[email], volunteer_record,
                    volunteers_by_email[email].get("signupdate", ""),
                    volunteer_record.get("signupdate", "")
                )

        # Get pending tutors - extract UNIQUE data from SignedUp + Pending_Tutor table
        # Note: Pending_Tutor.id points to SignedUp, need to find associated Staff via Tutors or General_Volunteer
        pending_tutors = Pending_Tutor.objects.select_related('id').all()
        for pending in pending_tutors:
            # Convert gender boolean to readable string (True = Female/נקבה, False = Male/זכר)
            gender_str = "נקבה" if pending.id.gender else "זכר"
            
            # Get staff record: Pending_Tutor's SignedUp may be linked to Tutors or General_Volunteer
            staff_record = None
            try:
                # Try to find in Tutors first
                tutor = Tutors.objects.get(id=pending.id)
                staff_record = tutor.staff
            except Tutors.DoesNotExist:
                try:
                    # Try to find in General_Volunteer
                    general_vol = General_Volunteer.objects.get(id=pending.id)
                    staff_record = general_vol.staff
                except General_Volunteer.DoesNotExist:
                    # No associated staff found
                    staff_record = None
            
            active_str = "פעיל" if (staff_record and staff_record.is_active) else "עזב"
            
            email = pending.id.email or ""
            volunteer_record = {
                # SignedUp table fields - CORE 10 fields
                "volunteer_id": pending.id.id,
                "first_name": pending.id.first_name,
                "last_name": pending.id.surname,
                "age": pending.id.age,
                "birth_date": pending.id.birth_date.strftime('%d/%m/%Y') if pending.id.birth_date else "",
                "gender": gender_str,
                "phone": pending.id.phone,
                "city": pending.id.city,
                "email": email,
                "want_tutor": "כן" if pending.id.want_tutor else "לא",
                
                # Pending Tutor-specific UNIQUE fields
                "signupdate": staff_record.created_at.strftime('%d/%m/%Y') if staff_record and staff_record.created_at else "",
                "status": active_str,
            }
            if email not in volunteers_by_email:
                volunteers_by_email[email] = volunteer_record
            else:
                # Merge: fill in empty values with new data
                _merge_volunteer_records(volunteers_by_email[email], volunteer_record)
                # Use most recent status based on signupdate
                volunteers_by_email[email]["status"] = _get_most_recent_status(
                    volunteers_by_email[email], volunteer_record,
                    volunteers_by_email[email].get("signupdate", ""),
                    volunteer_record.get("signupdate", "")
                )

        # Get staff-only members (management, coordinators, sys admins)
        # Filter for staff who don't have either "Tutor" or "General Volunteer" roles
        from django.db.models import Q
        staff_only = Staff.objects.exclude(
            Q(roles__role_name="Tutor") | Q(roles__role_name="General Volunteer")
        ).distinct()
        
        for staff in staff_only:
            email = staff.email or ""
            # Staff-only records don't have SignedUp data, so most fields are empty/null
            volunteer_record = {
                # Staff fields only - SignedUp fields are unavailable
                "volunteer_id": staff.staff_id,
                "first_name": staff.first_name,
                "last_name": staff.last_name,
                "age": "",  # No age data for staff-only
                "birth_date": "",  # No birth_date data for staff-only
                "gender": "",  # No gender data for staff-only
                "phone": "",  # No phone data for staff-only (use email instead)
                "city": "",  # No city data for staff-only
                "email": email,
                "want_tutor": "",  # Not applicable for staff-only
                
                # Staff-specific fields - use actual is_active status from DB
                "signupdate": staff.created_at.strftime('%d/%m/%Y') if staff.created_at else "",
                "status": "פעיל" if staff.is_active else "עזב",
            }
            if email not in volunteers_by_email:
                volunteers_by_email[email] = volunteer_record
            else:
                # Merge: fill in empty values with new data, OR status logic
                _merge_volunteer_records(volunteers_by_email[email], volunteer_record)
                # Use most recent status based on signupdate
                volunteers_by_email[email]["status"] = _get_most_recent_status(
                    volunteers_by_email[email], volunteer_record,
                    volunteers_by_email[email].get("signupdate", ""),
                    volunteer_record.get("signupdate", "")
                )
        
        # Convert dictionary back to list
        volunteers_data = list(volunteers_by_email.values())

        api_logger.info(f"Generated volunteer report with {len(volunteers_data)} volunteers - UNIQUE volunteer data only, NO duplicates")
        return JsonResponse(
            {
                "success": True,
                "count": len(volunteers_data),
                "data": volunteers_data,
                "note": "Volunteer UNIQUE data: SignedUp core fields + role-specific fields. No duplicate info (staff, related child data, or redundant timestamps)."
            },
            status=200
        )

    except Exception as e:
        api_logger.error(f"Error in get_all_volunteers_irs_report: {str(e)}")
        return JsonResponse(
            {"error": f"Failed to generate report: {str(e)}"}, status=500
        )