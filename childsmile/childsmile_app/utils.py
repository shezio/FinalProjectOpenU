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
    PossibleMatches,
    PrevTutorshipStatuses,
    InitialFamilyData,
    CityGeoDistance,
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
from django.core.exceptions import ValidationError
from .audit_utils import log_api_action
import datetime
import urllib3
from django.utils.timezone import make_aware
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from geopy.geocoders import Nominatim
import threading, time
from time import sleep
from math import sin, cos, sqrt, atan2, radians, ceil
import json
import os
from django.db.models import Count, F, Q
import tempfile
import shutil
from filelock import FileLock
from .logger import api_logger
from django.views.decorators.csrf import csrf_exempt, csrf_protect

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ============================================================================
# AGE CALCULATION UTILITIES
# ============================================================================

def calculate_age_from_birth_date(birth_date):
    """
    Calculate age from a birth date.
    :param birth_date: A date object representing the birth date.
    :return: Integer age in years, or None if birth_date is None.
    """
    if not birth_date:
        return None
    today = datetime.date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def parse_date_string(date_string):
    """
    Parse a date string in dd/mm/yyyy format to a date object.
    :param date_string: String in dd/mm/yyyy format.
    :return: date object or None if parsing fails.
    """
    if not date_string:
        return None
    try:
        # Handle dd/mm/yyyy format
        if '/' in str(date_string):
            parts = str(date_string).split('/')
            if len(parts) == 3:
                day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                return datetime.date(year, month, day)
        # Handle yyyy-mm-dd format (ISO)
        elif '-' in str(date_string):
            parts = str(date_string).split('-')
            if len(parts) == 3:
                year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                return datetime.date(year, month, day)
        return None
    except (ValueError, TypeError):
        return None


def format_date_to_string(date_obj):
    """
    Format a date object to dd/mm/yyyy string.
    :param date_obj: A date object.
    :return: String in dd/mm/yyyy format or None.
    """
    if not date_obj:
        return None
    return date_obj.strftime('%d/%m/%Y')


def refresh_volunteer_ages():
    """
    Refresh/recalculate ages for all volunteers and tutors in SignedUp table
    based on their birth_date field.
    :return: Dictionary with counts of updated records.
    """
    updated_count = 0
    skipped_count = 0
    
    # Get all SignedUp records with birth_date
    signedups = SignedUp.objects.filter(birth_date__isnull=False)
    
    for signedup in signedups:
        new_age = calculate_age_from_birth_date(signedup.birth_date)
        if new_age is not None and new_age != signedup.age:
            signedup.age = new_age
            signedup.save(update_fields=['age'])
            updated_count += 1
        else:
            skipped_count += 1
    
    api_logger.info(f"Volunteer ages refreshed: {updated_count} updated, {skipped_count} unchanged")
    return {'updated': updated_count, 'skipped': skipped_count}


def refresh_tutor_ages_only():
    """
    Refresh/recalculate ages only for tutors (not general volunteers) in SignedUp table
    based on their birth_date field. Used for tutorship matching.
    :return: Dictionary with counts of updated records.
    """
    updated_count = 0
    skipped_count = 0
    
    # Get tutor IDs from Tutors table
    tutor_ids = Tutors.objects.values_list('id_id', flat=True)
    
    # Get SignedUp records for tutors with birth_date
    signedups = SignedUp.objects.filter(id__in=tutor_ids, birth_date__isnull=False)
    
    for signedup in signedups:
        new_age = calculate_age_from_birth_date(signedup.birth_date)
        if new_age is not None and new_age != signedup.age:
            signedup.age = new_age
            signedup.save(update_fields=['age'])
            updated_count += 1
        else:
            skipped_count += 1
    
    api_logger.info(f"Tutor ages refreshed: {updated_count} updated, {skipped_count} unchanged")
    return {'updated': updated_count, 'skipped': skipped_count}


def refresh_children_ages():
    """
    Refresh/recalculate ages for all children based on their date_of_birth.
    Note: Children model has age as a @property, not a field, so this updates
    the PossibleMatches table child_age values.
    :return: Dictionary with counts of updated records.
    """
    # Children model uses @property for age calculation, so no DB update needed
    # But we need to update PossibleMatches table for reports
    updated_count = 0
    
    # Update child_age in PossibleMatches based on current date
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE childsmile_app_possiblematches pm
            SET child_age = EXTRACT(YEAR FROM AGE(current_date, c.date_of_birth))::int
            FROM childsmile_app_children c
            WHERE pm.child_id = c.child_id
            AND pm.child_age != EXTRACT(YEAR FROM AGE(current_date, c.date_of_birth))::int
        """)
        updated_count = cursor.rowcount
    
    api_logger.info(f"Children ages in PossibleMatches refreshed: {updated_count} updated")
    return {'updated': updated_count}


def refresh_all_ages_for_matching():
    """
    Refresh all ages needed for tutorship matching:
    - Tutor ages (from SignedUp.birth_date)
    - Children ages (in PossibleMatches from Children.date_of_birth)
    :return: Dictionary with combined counts.
    """
    tutor_result = refresh_tutor_ages_only()
    children_result = refresh_children_ages()
    
    return {
        'tutors_updated': tutor_result['updated'],
        'tutors_skipped': tutor_result.get('skipped', 0),
        'children_updated': children_result['updated']
    }


# ============================================================================
# END OF AGE CALCULATION UTILITIES
# ============================================================================


def get_enum_values(enum_type):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT unnest(enum_range(NULL::{enum_type}))")
        return [row[0] for row in cursor.fetchall()]

def get_or_update_city_location(city, retries=3, delay=2):
    """
    Retrieve the latitude and longitude of a city from the DB.
    If the city is not found, geocode it and update the DB.
    
    Gracefully handles API unavailability by returning None instead of crashing.
    This allows matches to proceed without distance data when the geocoding API is down.
    """
    # Try to find any record where city is city1 or city2
    geo = CityGeoDistance.objects.filter(city1=city).first() or CityGeoDistance.objects.filter(city2=city).first()
    if geo:
        if geo.city1 == city and geo.city1_latitude and geo.city1_longitude:
            return {"latitude": geo.city1_latitude, "longitude": geo.city1_longitude}
        if geo.city2 == city and geo.city2_latitude and geo.city2_longitude:
            return {"latitude": geo.city2_latitude, "longitude": geo.city2_longitude}

    # If not found, try to geocode and store in DB
    # But gracefully handle API unavailability
    try:
        geolocator = Nominatim(user_agent="childsmile_app")
        for attempt in range(retries):
            try:
                location = geolocator.geocode(f"{city}, ישראל", timeout=10) or geolocator.geocode(city, timeout=10)
                if location:
                    # Save a dummy CityGeoDistance row with city as city1 and empty city2
                    CityGeoDistance.objects.get_or_create(
                        city1=city, city2="",
                        defaults={
                            "city1_latitude": location.latitude,
                            "city1_longitude": location.longitude,
                        }
                    )
                    return {"latitude": location.latitude, "longitude": location.longitude}
            except (GeocoderUnavailable, GeocoderTimedOut) as e:
                # API is unavailable or timed out - log and return None (graceful degradation)
                api_logger.debug(f"DEBUG: Geocoding API unavailable for city '{city}' (attempt {attempt+1}/{retries}): {type(e).__name__}")
                if attempt < retries - 1:
                    time.sleep(delay)
                else:
                    # After all retries, log as warning and return None
                    api_logger.warning(f"WARNING: Geocoding API unavailable for city '{city}' after {retries} attempts. Proceeding without coordinates.")
                    return None
            except Exception as e:
                # Unexpected error - log and continue
                api_logger.debug(f"DEBUG: Unexpected error geocoding city '{city}': {type(e).__name__}: {str(e)[:100]}")
                time.sleep(delay)
        return None
    except Exception as e:
        # Catch-all for any unexpected errors in the entire function
        api_logger.warning(f"WARNING: get_or_update_city_location failed for city '{city}': {str(e)[:100]}")
        return None


def promote_pending_tutor_to_tutor(task):
    # 1. Get the Pending_Tutor instance (FK on task)
    pending_tutor = task.pending_tutor
    if not pending_tutor:
        return False, "Pending tutor not found"

    # 2. Get the related SignedUp instance (FK on Pending_Tutor)
    signedup = pending_tutor.id  # This is the SignedUp instance
    if not signedup:
        return False, "SignedUp row not found for pending tutor"

    # 3. Get the Staff instance by email (from SignedUp)
    staff = Staff.objects.filter(email=signedup.email).first()
    if not staff:
        return False, "Staff not found for pending tutor email"

    # 4. Remove "General Volunteer" role if present
    general_vol_role = Role.objects.filter(role_name="General Volunteer").first()
    if general_vol_role and general_vol_role in staff.roles.all():
        staff.roles.remove(general_vol_role)

    # 5. Add "Tutor" role if not present
    tutor_role = Role.objects.filter(role_name="Tutor").first()
    if tutor_role and tutor_role not in staff.roles.all():
        staff.roles.add(tutor_role)

    # 6. Insert new row in Tutors table (if not already exists)
    if not Tutors.objects.filter(id_id=signedup.id).exists():
        Tutors.objects.create(
            id_id=signedup.id,
            staff=staff,
            tutorship_status="אין_חניך",
            tutor_email=signedup.email,
        )

    return True, "Promoted successfully"


def check_matches_permissions(request, required_permissions):
    """
    Check if the user has the required permissions for possible matches.
    :param request: The HTTP request object.
    :param required_permissions: List of required permissions.
    :raises PermissionError: If the user does not have the required permissions.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        raise PermissionError("Authentication credentials were not provided.")

    if not any(
        has_permission(request, "possiblematches", permission)
        for permission in required_permissions
    ):
        raise PermissionError(
            f"You do not have any of the required permissions: {', '.join(required_permissions)}"
        )


def fetch_possible_matches():
    """
    Fetch possible matches from the database.
    
    This populates the PossibleMatches table used by BOTH:
    - Wizard (will be filtered to show only children with 0 tutors)
    - Report (shows ALL matches for manual multi-tutor matching)
    
    RULES:
    - Include ALL children (even those with existing tutors) for the report
    - Only exclude specific child+tutor pairs that already have a non-inactive tutorship
    - Only show tutors who do NOT have any active/pending tutorship (tutor = 1 tutee max)
    """
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
        FALSE AS is_used
    FROM childsmile_app_children child
    JOIN childsmile_app_signedup signedup
        ON child.gender = signedup.gender
    JOIN childsmile_app_tutors tutor
        ON signedup.id = tutor.id_id
    JOIN childsmile_app_staff staff
        ON tutor.staff_id = staff.staff_id
    WHERE 
        -- Only exclude THIS SPECIFIC child+tutor pair if already matched (allows multi-tutor via report)
        NOT EXISTS (
            SELECT 1
            FROM childsmile_app_tutorships tutorship
            WHERE tutorship.child_id = child.child_id 
            AND tutorship.tutor_id = tutor.id_id
            AND tutorship.tutorship_activation <> 'inactive'
        )
        -- Exclude tutors that have ANY active/pending tutorship (tutor can only have ONE tutee)
        AND NOT EXISTS (
            SELECT 1
            FROM childsmile_app_tutorships tutorship
            WHERE tutorship.tutor_id = tutor.id_id
            AND tutorship.tutorship_activation <> 'inactive'
        )
        -- Only include active staff members
        AND staff.is_active = TRUE
        -- Exclude deceased and healthy children (use parameterized query to avoid encoding issues)
        AND child.status NOT IN (%s, %s);
    """
    # Use parameterized query for Hebrew values to avoid encoding issues with special characters
    excluded_statuses = ('ז״ל', 'בריא')
    with connection.cursor() as cursor:
        cursor.execute(query, excluded_statuses)
        rows = cursor.fetchall()
        if not rows:
            return []  # Ensure it returns a list
        return [
            {
                "child_id": row[0],
                "tutor_id": row[1],
                "child_full_name": row[2],
                "tutor_full_name": row[3],
                "child_city": row[4],
                "tutor_city": row[5],
                "child_birth_date": format_date_to_string(row[6]) if row[6] else None,
                "child_age": row[7],
                "tutor_birth_date": format_date_to_string(row[8]) if row[8] else None,
                "tutor_age": row[9],
                "child_gender": row[10],
                "tutor_gender": row[11],
                "distance_between_cities": row[12],
                "grade": row[13],
                "is_used": row[14],
            }
            for row in rows
        ]


def clear_possible_matches():
    """
    Clear the possible matches table.
    This function deletes all records from the PossibleMatches table.
    """
    PossibleMatches.objects.all().delete()
    api_logger.debug("DEBUG: Emptied the possiblematches table.")


def insert_new_matches(matches):
    """
    Insert new matches into the PossibleMatches table.
    :param matches: List of match objects to be inserted.
    """
    new_matches = [
        PossibleMatches(
            child_id=match["child_id"],
            tutor_id=match["tutor_id"],
            child_full_name=match["child_full_name"],
            tutor_full_name=match["tutor_full_name"],
            child_city=match["child_city"],
            tutor_city=match["tutor_city"],
            child_age=match["child_age"],
            tutor_age=match["tutor_age"],
            child_gender=match["child_gender"],
            tutor_gender=match["tutor_gender"],
            distance_between_cities=match["distance_between_cities"],
            grade=match["grade"],
            is_used=match["is_used"],
        )
        for match in matches
    ]
    PossibleMatches.objects.bulk_create(new_matches)
    api_logger.debug(f"DEBUG: Inserted {len(new_matches)} new records into possiblematches.")


def calculate_distances(matches):
    """
    Calculate distances and coordinates between child and tutor cities in the matches.
    
    Strategy:
    1. Collect all unique city pairs
    2. Identify missing pairs from cache (CityGeoDistance table)
    3. Process missing pairs in chunks of 10 (synchronously, waiting for completion)
    4. Return all matches with complete distance data (distance_pending=False)
    
    :param matches: List of match objects, each containing child_city and tutor_city.
    :return: List of matches with calculated distances and coordinates.
    """
    api_logger.debug(f"DEBUG: calculate_distances called for {len(matches)} matches")
    
    # Step 1: Collect all unique city pairs
    city_pairs = set()
    for match in matches:
        child_city = match.get("child_city", "").strip()
        tutor_city = match.get("tutor_city", "").strip()
        if child_city and tutor_city and child_city != tutor_city:
            # Normalize pair to avoid duplicates (city1, city2) == (city2, city1)
            pair = tuple(sorted([child_city, tutor_city]))
            city_pairs.add(pair)
    
    api_logger.debug(f"DEBUG: Found {len(city_pairs)} unique city pairs to calculate")
    
    # Step 2: Identify missing pairs that need calculation
    missing_pairs = []
    for city1, city2 in city_pairs:
        # Check if this pair exists in cache with complete data
        geo = CityGeoDistance.objects.filter(
            (Q(city1=city1, city2=city2) | Q(city1=city2, city2=city1))
        ).first()
        
        if not geo or not all([
            geo.city1_latitude,
            geo.city1_longitude,
            geo.city2_latitude,
            geo.city2_longitude,
            geo.distance is not None
        ]):
            missing_pairs.append((city1, city2))
    
    api_logger.debug(f"DEBUG: {len(missing_pairs)} city pairs missing from cache - will calculate in chunks")
    
    # Step 3: Process missing pairs in chunks of 10 (synchronously)
    chunk_size = 10
    for i in range(0, len(missing_pairs), chunk_size):
        chunk = missing_pairs[i:i+chunk_size]
        api_logger.debug(f"DEBUG: Processing chunk {i//chunk_size + 1} with {len(chunk)} city pairs")
        
        for city1, city2 in chunk:
            try:
                # Synchronous calculation - wait for completion
                # If API fails, this will gracefully return None and continue
                calculate_and_store_distance_force(city1, city2)
                api_logger.debug(f"DEBUG: Calculated distance for {city1} <-> {city2}")
            except Exception as e:
                # Log but don't crash - allow processing to continue
                api_logger.warning(f"WARNING: Failed to calculate distance for {city1} <-> {city2}: {str(e)[:100]}")
                continue
    
    # Step 4: Now populate match data from cache (all should be calculated)
    for match in matches:
        api_logger.debug(f"DEBUG: Processing match: {match}") 
        result = calculate_distance_between_cities(
            match["child_city"], match["tutor_city"]
        )
        api_logger.debug(
            f"DEBUG: Result from calculate_distance_between_cities: {result}"
        )

        if result:
            try:
                match["distance_between_cities"] = result["distance"]
                match["child_latitude"] = result["city1_latitude"]
                match["child_longitude"] = result["city1_longitude"]
                match["tutor_latitude"] = result["city2_latitude"]
                match["tutor_longitude"] = result["city2_longitude"]
                # Should be False now since we calculated everything
                match["distance_pending"] = result.get("distance_pending", False)
            except KeyError as e:
                api_logger.error(f"DEBUG: KeyError while accessing result: {e}")
                raise
        else:
            # Fallback if still missing (shouldn't happen after calculation)
            match["distance_between_cities"] = 0
            match["child_latitude"] = None
            match["child_longitude"] = None
            match["tutor_latitude"] = None
            match["tutor_longitude"] = None
            match["distance_pending"] = True
    
    return matches


# helper function to calculate distance between 2 cities in Israel
# cities come in hebrew names, we need to return the distance in km
def calculate_distance_between_cities(city1, city2):
    """
    Calculate the distance between two cities in kilometers and return their coordinates.
    First, check the CityGeoDistance table for the distance and coordinates.
    If not found or incomplete, trigger async calculation and return pending.
    """
    api_logger.debug(f"DEBUG: Calculating distance between {city1} and {city2}")

    geo = CityGeoDistance.objects.filter(city1=city1, city2=city2).first() or \
          CityGeoDistance.objects.filter(city1=city2, city2=city1).first()

    if geo and all([
        geo.city1_latitude is not None,
        geo.city1_longitude is not None,
        geo.city2_latitude is not None,
        geo.city2_longitude is not None,
        geo.distance is not None
    ]):
        return {
            "distance": geo.distance,
            "city1_latitude": geo.city1_latitude,
            "city1_longitude": geo.city1_longitude,
            "city2_latitude": geo.city2_latitude,
            "city2_longitude": geo.city2_longitude,
            "distance_pending": False,
        }

    # If not found or incomplete, trigger async calculation and return pending
    async_calculate_and_store_distance(city1, city2)
    return {
        "distance": 0,
        "city1_latitude": None,
        "city1_longitude": None,
        "city2_latitude": None,
        "city2_longitude": None,
        "distance_pending": True,
    }


# helper function to calculate the grade of possible matche according the distance between the two cities and the ages of the child and the tutor
# params: list of possible matches
# logic is:
# spread 100 linearly by the number of possible matches we will get out of same gender of tutor and child
# for example if we have 5 possible matches, we will get grades from 0 to 100 which means 1 match will get 0, 1 will get 25, 1 will get 50, 1 will get 75 and the last one will get 100
# then we will check the ages of the child and the tutor, if the gap between the ages is less than 5 years we will add 20 to the grade, if the gap is less than 10 years we will add 10 to the grade, if the gap is less than 15 years we will add 5 to the grade
# then if the distance between the two cities is less than 10 km we will add 20 to the grade, if the distance is less than 20 km we will add 10 to the grade, if the distance is less than 30 km we will add 5 to the grade
# if the distance is more than 30 km we will give 0 grade
# if the distance is more than 50 km we will give -5 grade
# max grade is 100, min grade is -5
# if the grade is more than 100 we will set it to 100, if the grade is less than -5 we will set it to -5


def calculate_grades(possible_matches):
    """
    Calculate the grade of a possible match based on distance and age differences.
    :param possible_matches: List of possible match objects, each containing child_age, tutor_age, and distance.
    :return: List of matches with calculated grades.
    """
    # Define constants for grade calculation
    max_grade = 100
    max_age_bonus = 20
    mid_age_bonus = 10
    low_age_bonus = 5
    low_age_difference = 5
    mid_age_difference = 10
    high_age_difference = 15
    max_distance_bonus = 20
    mid_distance_bonus = 10
    low_distance_bonus = 5
    low_distance_diff = 10
    mid_distance_diff = 20
    high_distance_diff = 30
    penalty_distance_diff = 50
    high_distance_penalty = -5

    total_matches = len(possible_matches)  # Total number of matches

    # Iterate through the matches and calculate grades
    for index, match in enumerate(possible_matches):
        #        tutor_id = match.get("tutor_id")
        # Start with a base grade spread linearly across matches
        base_grade = (
            (index / (total_matches - 1)) * max_grade
            if total_matches > 1
            else max_grade
        )

        # Adjust grade based on age difference
        child_age = match.get("child_age")
        tutor_age = match.get("tutor_age")
        age_difference = abs(child_age - tutor_age)

        if age_difference < low_age_difference:
            base_grade += max_age_bonus
        elif age_difference < mid_age_difference:
            base_grade += mid_age_bonus
        elif age_difference < high_age_difference:
            base_grade += low_age_bonus

        # Adjust grade based on distance
        distance = match.get("distance_between_cities")
        if distance < low_distance_diff:
            base_grade += max_distance_bonus
        elif distance < mid_distance_diff:
            base_grade += mid_distance_bonus
        elif distance < high_distance_diff:
            base_grade += low_distance_bonus
        elif distance > penalty_distance_diff:
            base_grade = high_distance_penalty

        # Ensure the grade is within the allowed range and if its not fix it
        # if its less than -5 we will set it to -5, if its more than 100 we will set it to 100
        base_grade = max(high_distance_penalty, min(base_grade, max_grade))
        match["grade"] = ceil(base_grade)

    return possible_matches


def parse_date_field(date_value, field_name, return_string=False):
    """
    Parse a date field and return a valid date or None if the value is empty or invalid.
    If return_string=True, returns string in YYYY-MM-DD format instead of date object.
    """
    if date_value in [None, "", "null"]:
        api_logger.debug(f"DEBUG: {field_name} is empty or null.")
        return None
    try:
        parsed_date = datetime.datetime.strptime(date_value, "%Y-%m-%d").date()
        api_logger.debug(f"DEBUG: {field_name} parsed successfully: {parsed_date}")
        # Return as string (YYYY-MM-DD) if requested, otherwise return date object
        if return_string:
            return parsed_date.strftime("%Y-%m-%d")
        return parsed_date
    except ValueError:
        api_logger.error(f"DEBUG: {field_name} has an invalid date format: {date_value}")
        return None  # Return None instead of raising an exception




def create_task(task_data):
    """
    Internal function to create a task.
    """
    try:
        api_logger.debug(f"DEBUG: Received task_data: {task_data}")  # Log the incoming data

        # Validate the pending_tutor ID
        pending_tutor_id = task_data.get("pending_tutor")
        if pending_tutor_id:
            if not Pending_Tutor.objects.filter(
                pending_tutor_id=pending_tutor_id
            ).exists():
                raise ValueError(
                    f"Pending_Tutor with ID {pending_tutor_id} does not exist."
                )

        # Fetch the task type to get its name
        task_type = Task_Types.objects.get(id=task_data["type"])
        api_logger.debug(f"DEBUG: Task type fetched: {task_type.task_type}")

        initial_family_data_id = task_data.get("initial_family_data_id_fk")
        initial_family_data = None
        if initial_family_data_id:
            initial_family_data = InitialFamilyData.objects.get(
                pk=initial_family_data_id
            )

        task = Tasks.objects.create(
            description=task_data.get("description", task_type.task_type),  # Use provided description or task type name as fallback
            due_date=task_data["due_date"],
            status="לא הושלמה",  # Default status
            created_at=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            assigned_to_id=task_data["assigned_to"],
            related_child_id=task_data.get("child"),  # Allow null for child
            related_tutor_id=task_data.get("tutor"),  # Allow null for tutor
            task_type_id=task_data["type"],
            pending_tutor_id=pending_tutor_id,  # Use the correct Pending_Tutor ID
            names=task_data.get("names"),
            phones=task_data.get("phones"),
            other_information=task_data.get("other_information"),
            initial_family_data_id_fk=initial_family_data,
            user_info=task_data.get("user_info"),  # Store user information if provided
        )
        api_logger.debug(f"Task created successfully: {task}")
        return task
    except Task_Types.DoesNotExist:
        api_logger.error("Invalid task type ID.")
        raise ValueError("Invalid task type ID.")
    except Exception as e:
        api_logger.error(f"Error creating task: {str(e)}")
        raise e


def create_tasks_for_technical_coordinators_async(initial_family_data, task_type_id):
    """
    Run the task creation function asynchronously.
    """
    thread = threading.Thread(
        target=create_tasks_for_technical_coordinators,
        args=(initial_family_data, task_type_id),
    )
    thread.start()


def create_tasks_for_tutor_coordinators_async(pending_tutor_id, task_type_id):
    """
    Wrapper to run the task creation function asynchronously.
    """

    def wait_and_create_tasks():
        max_wait_time = 60  # Maximum wait time in seconds
        retry_interval = 5  # Retry interval in seconds
        elapsed_time = 0

        while elapsed_time < max_wait_time:
            if Pending_Tutor.objects.filter(pending_tutor_id=pending_tutor_id).exists():
                api_logger.debug(
                    f"DEBUG: Pending_Tutor with ID {pending_tutor_id} found in the database."
                )
                create_tasks_for_tutor_coordinators(pending_tutor_id, task_type_id)
                return
            api_logger.debug(
                f"DEBUG: Pending_Tutor with ID {pending_tutor_id} not found. Retrying in {retry_interval} seconds..."
            )
            time.sleep(retry_interval)
            elapsed_time += retry_interval

        api_logger.debug(
            f"DEBUG: Pending_Tutor with ID {pending_tutor_id} not found after {max_wait_time} seconds. Aborting task creation."
        )

    thread = threading.Thread(target=wait_and_create_tasks)
    thread.start()


def create_tasks_for_tutor_coordinators(pending_tutor_id, task_type_id):
    """
    Create tasks for all tutor coordinators for the given Pending_Tutor.
    """
    try:
        # Fetch the role for Tutors Coordinator
        tutor_coordinator_role = Role.objects.filter(
            role_name="Tutors Coordinator"
        ).first()
        if not tutor_coordinator_role:
            api_logger.error("Role 'Tutors Coordinator' not found in the database.")
            return

        # Fetch all tutor coordinators
        tutor_coordinators = Staff.objects.filter(roles=tutor_coordinator_role)
        if not tutor_coordinators.exists():
            api_logger.warning("No Tutors Coordinators found in the database.")
            return

        api_logger.debug(f"Found {tutor_coordinators.count()} Tutors Coordinators.")

        # Create tasks for each tutor coordinator
        for coordinator in tutor_coordinators:
            task_data = {
                "description": "ראיון מועמד לחונכות",
                "due_date": (now().date() + datetime.timedelta(days=7)).strftime(
                    "%Y-%m-%d"
                ),
                "status": "לא הושלמה",  # "Not Completed" in Hebrew
                "assigned_to": coordinator.staff_id,
                "pending_tutor": pending_tutor_id,  # Pass the Pending_Tutor ID
                "type": task_type_id,
            }

            api_logger.debug(f"DEBUG: Task data being sent to create_task_internal: {task_data}")

            try:
                task = create_task_internal(task_data)
                api_logger.debug(f"DEBUG: Task created successfully with ID {task.task_id}")
            except Exception as e:
                api_logger.error(f"ERROR: Error creating task: {str(e)}")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while creating tasks: {str(e)}")


def create_tasks_for_technical_coordinators(initial_family_data, task_type_id):
    """
    Create tasks for all Technical Coordinators for the given InitialFamilyData.
    """
    try:
        # Fetch the role for Technical Coordinator
        tech_coordinator_role = Role.objects.filter(
            role_name="Technical Coordinator"
        ).first()
        if not tech_coordinator_role:
            api_logger.debug("Role 'Technical Coordinator' not found in the database.")
            return

        # Fetch all Technical Coordinators (roles is a many-to-many field)
        tech_coordinators = Staff.objects.filter(roles=tech_coordinator_role)
        if not tech_coordinators.exists():
            api_logger.warning("No Technical Coordinators found in the database.")
            return

        api_logger.debug(f"Found {tech_coordinators.count()} Technical Coordinators.")

        # Get the task type object
        task_type = Task_Types.objects.get(id=task_type_id)

        # Create tasks for each technical coordinator
        for coordinator in tech_coordinators:
            task_data = {
                "description": "הוספת משפחה",
                "due_date": (now().date() + datetime.timedelta(days=7)).strftime(
                    "%Y-%m-%d"
                ),
                "status": "לא הושלמה",
                "assigned_to": coordinator.staff_id,
                "type": task_type.id,
                "names": initial_family_data.names,
                "phones": initial_family_data.phones,
                "other_information": initial_family_data.other_information,
                "initial_family_data_id_fk": initial_family_data.initial_family_data_id,
            }
            api_logger.debug(f"DEBUG: Task data being sent to create_task_internal: {task_data}")
            try:
                task = create_task_internal(task_data)
                api_logger.debug(f"DEBUG: Task created successfully with ID {task.task_id}")
            except Exception as e:
                api_logger.error(f"ERROR: Error creating task: {str(e)}")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while creating tasks: {str(e)}")


def is_admin(user):
    """
    Check if the given user is an admin.
    """
    with connection.cursor() as cursor:
        role_ids = list(user.roles.values_list("id", flat=True))  # Convert to a list
        api_logger.debug(f"DEBUG: Role IDs for user '{user.username}': {role_ids}")  # Debug log
        if not role_ids:
            role_ids = [
                -1
            ]  # Use a dummy value to prevent SQL errors if the list is empty
        cursor.execute(
            """
            SELECT 1
            FROM childsmile_app_role r
            WHERE r.id = ANY(%s) AND r.role_name = 'System Administrator';
            """,
            [role_ids],  # Pass the list directly
        )
        is_admin_result = cursor.fetchone() is not None
        api_logger.debug(
            f"DEBUG: Is user '{user.username}' an admin? {is_admin_result}"
        )  # Debug log
        return is_admin_result


def has_permission(request, resource, action):
    """
    Check if the user has the required permission for a specific resource and action.
    """
    permissions = request.session.get("permissions", [])
    api_logger.verbose(f"VERBOSE: Permissions: {permissions}")  # Debug log
    prefixed_resource = (
        f"childsmile_app_{resource}"  # Add the prefix to the resource name
    )

    return any(
        permission["resource"] == prefixed_resource and permission["action"] == action
        for permission in permissions
    )


def has_initial_family_data_permission(request, action):
    """
    Check if the user has the required permission for the InitialFamilyData resource and action.
    """
    permissions = request.session.get("permissions", [])
    api_logger.debug(f"DEBUG: Permissions: {permissions}")  # Debug log
    return any(
        permission["resource"] == "initial_family_data"
        and permission["action"] == action
        for permission in permissions
    )


def delete_other_tasks_with_initial_family_data(task):
    """
    Deletes all tasks with the same initial_family_data_id_fk as the given task,
    except the task itself.
    """
    Tasks.objects.filter(
        initial_family_data_id_fk=task.initial_family_data_id_fk
    ).exclude(pk=task.pk).delete()


def delete_other_tasks_with_initial_family_data_async(task):
    thread = threading.Thread(
        target=delete_other_tasks_with_initial_family_data, args=(task,)
    )
    thread.start()


in_progress_pairs = set()


def async_calculate_and_store_distance(city1, city2):
    pair = tuple(sorted([city1, city2]))
    if pair in in_progress_pairs:
        return  # Already being calculated
    in_progress_pairs.add(pair)

    def worker():
        try:
            calculate_and_store_distance_force(city1, city2)
        finally:
            in_progress_pairs.discard(pair)

    threading.Thread(target=worker, daemon=True).start()


def calculate_and_store_distance_force(city1, city2):
    """
    Always calculate and store the distance between city1 and city2 if not present.
    This function does NOT call async_calculate_and_store_distance.
    
    Gracefully handles API unavailability - returns silently without crashing.
    """
    try:
        api_logger.debug(
            f"DEBUG: [FORCE] Calculating and storing distance between {city1} and {city2}"
        )

        # Ensure both cities have coordinates
        loc1 = get_or_update_city_location(city1)
        loc2 = get_or_update_city_location(city2)
        
        # Graceful degradation: if geocoding failed (returns None), just return
        if not loc1 or not loc1.get("latitude") or not loc2 or not loc2.get("latitude"):
            api_logger.debug(f"DEBUG: [FORCE] Could not geocode one or both cities: {city1}, {city2} - skipping distance calculation")
            return

        lat1, lon1 = loc1["latitude"], loc1["longitude"]
        lat2, lon2 = loc2["latitude"], loc2["longitude"]

        # Haversine formula
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = (sin(dlat / 2) ** 2) + cos(radians(lat1)) * cos(radians(lat2)) * (
            sin(dlon / 2) ** 2
        )
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = ceil(R * c)

        # Save city2 data under city1 using the safe updater
        add_city_distance(city1, city2, distance, lat2, lon2)

        api_logger.debug(
            f"DEBUG: [FORCE] Calculated and saved distance for {city1} and {city2}: {distance} km"
        )
    except Exception as e:
        # Catch any unexpected errors and log them without crashing
        api_logger.warning(f"WARNING: [FORCE] Exception in calculate_and_store_distance_force for {city1} <-> {city2}: {str(e)[:100]}")

def add_city_location(city, lat, lon):
    # Update all records where city is city1 or city2
    CityGeoDistance.objects.filter(city1=city).update(city1_latitude=lat, city1_longitude=lon)
    CityGeoDistance.objects.filter(city2=city).update(city2_latitude=lat, city2_longitude=lon)
    # Or create a dummy record if none exists
    if not CityGeoDistance.objects.filter(city1=city).exists() and not CityGeoDistance.objects.filter(city2=city).exists():
        CityGeoDistance.objects.create(city1=city, city2="", city1_latitude=lat, city1_longitude=lon)

def add_city_distance(city1, city2, distance, lat2, lon2):
    # Get city1's coordinates from geocoding or other source
    loc1 = get_or_update_city_location(city1)
    lat1 = loc1.get("latitude") if loc1 else None
    lon1 = loc1.get("longitude") if loc1 else None
    obj, created = CityGeoDistance.objects.get_or_create(city1=city1, city2=city2)
    obj.city1_latitude = lat1
    obj.city1_longitude = lon1
    obj.city2_latitude = lat2
    obj.city2_longitude = lon2
    obj.distance = distance
    obj.save()

def is_valid_bigint_child_id(child_id):
    """
    Validate child_id as a bigint (9-digit ID)
    BigInt range: -9223372036854775808 to 9223372036854775807
    But we want exactly 9 digits for Israeli ID
    """
    try:
        # Handle string input
        if isinstance(child_id, str):
            if not child_id.isdigit():
                return False
            child_id = int(child_id)
        
        # Must be an integer
        if not isinstance(child_id, int):
            return False
            
        # Must be positive and exactly 9 digits
        if child_id <= 0:
            return False
            
        # Check it fits in bigint range (though 9 digits always will)
        if child_id > 9223372036854775807 or child_id < -9223372036854775808:
            return False
            
        # Must be exactly 9 digits
        return len(str(child_id)) == 9
        
    except (ValueError, TypeError, OverflowError):
        return False
    
def is_valid_date(date_of_birth):
    # check that the date is valid meaning the age doesnt exceed 100 years for the given date
    # also verify that the date is in the past
    # also verify the year has 4 digits at least
    try:
        birth_date = datetime.datetime.strptime(date_of_birth, "%Y-%m-%d")
        age = (datetime.datetime.now() - birth_date).days // 365
        return 0 <= age <= 100 and birth_date < datetime.datetime.now() and birth_date.year >= 1000
    except (ValueError, TypeError):
        return False


def is_user_approved(staff_user):
    """
    Check if a staff user has registration_approved = True
    """
    return staff_user.registration_approved


def create_tasks_for_admins_async(staff_user_id, user_name, user_email):
    """
    Async wrapper to create registration approval tasks for all admins
    """
    from threading import Thread
    thread = Thread(
        target=create_tasks_for_admins,
        args=(staff_user_id, user_name, user_email),
        daemon=True
    )
    thread.start()


def create_tasks_for_admins(staff_user_id, user_name, user_email):
    """
    Create registration approval tasks for all admin users.
    When an admin moves to "in progress", tasks are deleted from other admins.
    """
    try:
        # Fetch the System Manager role (admins)
        admin_role = Role.objects.filter(role_name="System Administrator").first()
        if not admin_role:
            api_logger.debug("Role 'System Administrator' not found in the database.")
            return

        # Fetch all admins (System Administrators)
        admins = Staff.objects.filter(roles=admin_role)
        if not admins.exists():
            api_logger.warning("No System Administrators found in the database.")
            return

        api_logger.debug(f"Found {admins.count()} System Administrators for registration approval task.")

        # Get the task type for registration approval
        task_type = Task_Types.objects.filter(task_type="אישור הרשמה").first()
        if not task_type:
            api_logger.error("Task type 'אישור הרשמה' not found in the database.")
            return

        # Get the staff user and SignedUp record to extract their data
        user_info = {}
        try:
            staff_user = Staff.objects.get(staff_id=staff_user_id)
            user_info = {
                "full_name": staff_user.first_name + " " + staff_user.last_name,
                "email": staff_user.email,
                "created_at": staff_user.created_at.isoformat() if staff_user.created_at else None,  # Convert to ISO string
            }
        except Staff.DoesNotExist:
            api_logger.error(f"Staff user with ID {staff_user_id} not found")
        
        # Also get SignedUp data if available
        try:
            signed_up = SignedUp.objects.get(email=user_email)
            # add more key values to user_info dict
            # the signed up id, age, gender, phone, city ,want_tutor to user_info dict
            user_info.update({
                "ID": signed_up.id,
                "age": signed_up.age,
                "gender": signed_up.gender,
                "phone": signed_up.phone,
                "city": signed_up.city,
                "want_tutor": signed_up.want_tutor
            })
        except SignedUp.DoesNotExist:
            api_logger.debug(f"SignedUp record not found for email {user_email}")

        # Create tasks for each admin    
        for admin in admins:
            task_data = {
                "description": f"אישור הרשמה",
                "due_date": (now().date() + datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
                "status": "לא הושלמה",
                "assigned_to": admin.staff_id,
                "type": task_type.id,
                "user_info": user_info,  # Include user_info
            }
            api_logger.debug(f"DEBUG: Creating registration approval task for admin {admin.staff_id}: {task_data}")
            try:
                task = create_task_internal(task_data)
                api_logger.info(f"Registration approval task created for admin {admin.staff_id}, task ID: {task.task_id}")
            except Exception as e:
                api_logger.error(f"ERROR: Error creating registration approval task: {str(e)}")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while creating registration approval tasks: {str(e)}")


def delete_other_registration_approval_tasks_async(task):
    """
    Async wrapper to delete other registration approval tasks
    """
    from threading import Thread
    thread = Thread(
        target=delete_other_registration_approval_tasks,
        args=(task,),
        daemon=True
    )
    thread.start()


def delete_other_registration_approval_tasks(task):
    """
    Delete all other registration approval tasks for the same user when one admin moves to "in progress"
    """
    try:
        api_logger.info(f"delete_other_registration_approval_tasks called for task {task.task_id}")
        
        # Extract email from user_info if available
        user_email = None
        if task.user_info and isinstance(task.user_info, dict):
            user_email = task.user_info.get("email")
        
        # Fallback: try to extract from description
        if not user_email:
            description = task.description
            import re
            email_match = re.search(r'\(([^)]+)\)', description)
            if email_match:
                user_email = email_match.group(1)
        
        if not user_email:
            api_logger.warning(f"Could not extract email from task {task.task_id} - user_info: {task.user_info}, description: {task.description}")
            return
        
        api_logger.debug(f"Looking for other registration approval tasks for email {user_email}")
        
        # Find all other registration approval tasks
        all_reg_tasks = Tasks.objects.filter(
            task_type__task_type="אישור הרשמה"
        ).exclude(task_id=task.task_id)
        
        # Filter by matching email in user_info
        other_tasks = []
        for t in all_reg_tasks:
            task_email = None
            if t.user_info and isinstance(t.user_info, dict):
                task_email = t.user_info.get("email")
            
            # Fallback for old tasks
            if not task_email and t.description:
                import re
                email_match = re.search(r'\(([^)]+)\)', t.description)
                if email_match:
                    task_email = email_match.group(1)
            
            if task_email and task_email == user_email:
                other_tasks.append(t)
        
        api_logger.info(f"Found {len(other_tasks)} other registration approval tasks for {user_email}")
        
        deleted_count = 0
        for other_task in other_tasks:
            try:
                other_task.delete()
                deleted_count += 1
                api_logger.info(f"Deleted registration approval task {other_task.task_id} after admin {task.assigned_to_id} moved to בביצוע")
            except Exception as e:
                api_logger.error(f"Error deleting task {other_task.task_id}: {str(e)}")
        
        api_logger.info(f"Successfully deleted {deleted_count} other registration approval tasks for {user_email}")
    except Exception as e:
        api_logger.error(f"ERROR: An error occurred while deleting other registration approval tasks: {str(e)}")


def conditional_csrf(view_func):
    is_prod = os.environ.get("DJANGO_ENV") == "production"
    return csrf_protect(view_func) if is_prod else csrf_exempt(view_func)


def get_responsible_coordinator_for_family(tutoring_status, child_status=None):
    """
    Get the appropriate coordinator assignment based on tutoring and medical status.
    
    Coordinator Assignment Rules:
    - "ללא" (None/No Coordinator): For בריא (Healthy) or ז״ל (Deceased) children
      (Can still be overridden if needed, but system default is "ללא")
    - Family Coordinator: For non-tutored statuses (לא_רוצים, לא_רלוונטי, בוגר)
    - Tutored Families Coordinator: For tutored/searching statuses (למצוא_חונך, יש_חונך, 
                                    למצוא_חונך_אין_באיזור_שלו, למצוא_חונך_בעדיפות_גבוה, 
                                    שידוך_בסימן_שאלה)
    
    Parameters:
    - tutoring_status: The tutoring status of the child
    - child_status: The medical status (בריא, ז״ל, etc.) - passed for checking
    
    Returns "ללא" for healthy/deceased children, or the coordinator staff_id otherwise.
    """
    try:
        # If child is בריא (healthy) or ז״ל (deceased), no coordinator needed
        if child_status:
            child_status_normalized = str(child_status).strip()
            if child_status_normalized in ['בריא', 'ז״ל']:
                return 'ללא'
        
        # Normalize tutoring status - convert spaces to underscores just in case
        normalized_status = tutoring_status.replace(' ', '_') if tutoring_status else ''
        
        # Define status categories
        NON_TUTORED_STATUSES = {
            "לא_רוצים",      # NOT_WANTED
            "לא_רלוונטי",    # NOT_RELEVANT
            "בוגר"           # MATURE
        }
        
        TUTORED_STATUSES = {
            "למצוא_חונך",                    # FIND_TUTOR
            "יש_חונך",                       # HAS_TUTOR
            "למצוא_חונך_אין_באיזור_שלו",  # FIND_TUTOR_NO_AREA
            "למצוא_חונך_בעדיפות_גבוה",     # FIND_TUTOR_HIGH_PRIORITY
            "שידוך_בסימן_שאלה"               # MATCH_QUESTIONABLE
        }
        
        # Determine which coordinator to assign based on tutoring status
        if normalized_status in TUTORED_STATUSES:
            # Get Tutored Families Coordinator
            coordinator = Staff.objects.filter(
                roles__role_name='Tutored Families Coordinator'
            ).first()
            if coordinator:
                return coordinator.staff_id
        elif normalized_status in NON_TUTORED_STATUSES:
            # Get Families Coordinator
            coordinator = Staff.objects.filter(
                roles__role_name='Families Coordinator'
            ).first()
            if coordinator:
                return coordinator.staff_id
        
        # Fallback: Try Families Coordinator if status doesn't match any category
        coordinator = Staff.objects.filter(
            roles__role_name='Families Coordinator'
        ).first()
        if coordinator:
            return coordinator.staff_id
        
        # Last resort: return "ללא" if no coordinator found
        return 'ללא'
    except Exception as e:
        api_logger.error(f"Error getting responsible coordinator: {str(e)}")
        return 'ללא'


def get_staff_name_by_id(staff_id):
    """
    Get the full name of a staff member by their staff_id.
    Returns the name in format "first_name last_name" or None if not found.
    Handles cases where the stored value is already a name (legacy data).
    """
    try:
        if not staff_id:
            return None
        
        # If staff_id is not numeric, it might already be a name (legacy data)
        # Return it as-is if it's not a valid ID
        try:
            staff_id_int = int(staff_id)
        except (ValueError, TypeError):
            # It's not a number - might be a name already stored in DB
            # Return None so caller can handle it (or use the raw value)
            return None
        
        staff = Staff.objects.filter(staff_id=staff_id_int).first()
        if staff:
            return f"{staff.first_name} {staff.last_name}"
        
        return None
    except Exception as e:
        api_logger.error(f"Error getting staff name for ID {staff_id}: {str(e)}")
        return None


# INACTIVE STAFF FEATURE: Core functions for staff deactivation/reactivation

def deactivate_staff(staff, performed_by_user, deactivation_reason, request=None):
    """
    Deactivate a staff member and preserve their tutorships as historical records.
    
    Steps:
    1. Validate deactivation reason
    2. Save current role IDs to JSON
    3. Clear all current roles
    4. Add Inactive role
    5. Set is_active flag to False
    6. Handle tutorships - create exact duplicates with tutorship_activation='inactive'
    7. Log to audit
    
    Args:
        staff: Staff object to deactivate
        performed_by_user: Staff object who is performing the deactivation
        deactivation_reason: String reason for deactivation (required, max 200 chars)
        request: Django request object for audit logging (optional)
    
    Returns:
        dict with status and message
    """
    # Step 1: Validate deactivation_reason
    if not deactivation_reason or not deactivation_reason.strip():
        raise ValidationError("Deactivation reason required")
    
    if len(deactivation_reason.strip()) > 200:
        raise ValidationError("Reason must be 200 chars or less")
    
    deactivation_reason = deactivation_reason.strip()
    
    # Step 2: Save current role IDs to JSON
    current_roles = staff.roles.all()
    role_ids = list(current_roles.values_list('id', flat=True))
    
    staff.previous_roles = {"role_ids": role_ids}
    staff.deactivation_reason = deactivation_reason
    staff.save()
    
    # Step 3: Clear all current roles
    staff.roles.clear()
    
    # Step 4: Add Inactive role
    try:
        inactive_role = Role.objects.get(role_name='Inactive')
        staff.roles.add(inactive_role)
    except Role.DoesNotExist:
        api_logger.error(f"Inactive role not found in database")
        raise ValidationError("Inactive role does not exist in system. Please contact administrator.")
    
    # Step 5: Set is_active flag
    staff.is_active = False
    staff.save()
    
    # Step 6: Handle tutorships - EXACT DUPLICATE with ALL fields
    active_tutorships = Tutorships.objects.filter(tutor__staff=staff)
    tutorship_count = active_tutorships.count()
    
    # Track children who may need status update (MULTI-TUTOR SUPPORT)
    affected_children = []
    
    for tutorship in active_tutorships:
        # Track the child for later status check
        affected_children.append(tutorship.child)
        
        # Create EXACT duplicate with ALL fields from original
        Tutorships.objects.create(
            child=tutorship.child,
            tutor=tutorship.tutor,
            approval_counter=tutorship.approval_counter,  # Keep same counter
            last_approver=tutorship.last_approver,
            created_date=tutorship.created_date,  # Keep original created date
            updated_at=datetime.datetime.now(),  # Set updated_at to now
            tutorship_activation='inactive'  # Mark only this field as inactive
        )
        
        # DELETE original tutorship (make room for the inactive copy)
        tutorship.delete()
    
    # MULTI-TUTOR SUPPORT: Update child status if they have no remaining active tutors
    for child in affected_children:
        remaining_active_tutorships = Tutorships.objects.filter(
            child=child,
            tutorship_activation__in=['pending_first_approval', 'active']
        ).count()
        
        if remaining_active_tutorships == 0:
            # No active tutors left - try to restore from PrevTutorshipStatuses
            prev_status = PrevTutorshipStatuses.objects.filter(
                child_id=child
            ).order_by('-last_updated').first()
            
            if prev_status and prev_status.child_tut_status:
                # Restore the original status before any tutorship was created
                child.tutoring_status = prev_status.child_tut_status
                api_logger.info(f"Child {child.child_id} status restored to '{prev_status.child_tut_status}' from PrevTutorshipStatuses")
            else:
                # Fallback to "looking for tutor" if no prev status found
                child.tutoring_status = 'למצוא_חונך'
                api_logger.info(f"Child {child.child_id} status set to 'למצוא_חונך' - no PrevTutorshipStatuses found")
            child.save()
    
    # Step 7: Log to audit
    log_api_action(
        request=request,
        action='DEACTIVATE_STAFF',
        success=True,
        additional_data={
            'staff_email': staff.email,
            'staff_full_name': f"{staff.first_name} {staff.last_name}",
            'staff_id': staff.staff_id,
            'previous_roles': [Role.objects.get(id=rid).role_name for rid in role_ids],
            'deactivation_reason': deactivation_reason,
            'tutorships_affected': tutorship_count
        },
        entity_type='Staff',
        entity_ids=[staff.staff_id]
    )
    
    api_logger.info(f"Staff deactivated: {staff.email} (ID: {staff.staff_id}) by {performed_by_user.email}. Reason: {deactivation_reason}")
    
    return {
        'status': 'success',
        'message': f'Staff {staff.first_name} {staff.last_name} deactivated successfully',
        'staff_id': staff.staff_id,
        'tutorships_affected': tutorship_count
    }


def activate_staff(staff, performed_by_user, request=None):
    """
    Reactivate a deactivated staff member and restore their previous roles.
    
    Steps:
    1. Verify staff is inactive
    2. Extract role IDs from JSON
    3. Query roles from database
    4. Remove Inactive role
    5. Restore all roles atomically
    6. Set active flag (DO NOT clear deactivation_reason)
    7. Log to audit
    
    Args:
        staff: Staff object to reactivate (must have is_active=False)
        performed_by_user: Staff object who is performing the reactivation
        request: Django request object for audit logging (optional)
    
    Returns:
        dict with status and message
    """
    # Step 1: Verify inactive
    if staff.is_active == True:
        raise ValidationError("Staff already active")
    
    if staff.previous_roles is None:
        raise ValidationError("No previous roles found to restore")
    
    # Step 2: Extract role IDs from JSON
    role_ids = staff.previous_roles.get('role_ids', [])
    
    if not role_ids:
        raise ValidationError("No roles to restore")
    
    # Step 3: Query roles from database (get available roles)
    roles_to_restore = Role.objects.filter(id__in=role_ids)
    
    # Handle case where some roles were deleted from system
    if len(roles_to_restore) != len(role_ids):
        api_logger.warning(f"Some roles no longer exist for {staff.username}. Using available roles.")
    
    # Step 4: Remove Inactive role
    try:
        inactive_role = Role.objects.get(role_name='Inactive')
        staff.roles.remove(inactive_role)
    except Role.DoesNotExist:
        api_logger.warning(f"Inactive role not found during reactivation")
    
    # Step 5: Restore all roles atomically
    staff.roles.set(roles_to_restore)
    
    # Step 6: Set active flag (DO NOT clear deactivation_reason - keep for audit trail)
    staff.is_active = True
    staff.previous_roles = None  # Clear the JSON backup
    staff.save()
    
    # Step 7: Log to audit
    restored_role_names = [r.role_name for r in roles_to_restore]
    
    log_api_action(
        request=request,
        action='ACTIVATE_STAFF',
        success=True,
        additional_data={
            'staff_email': staff.email,
            'staff_full_name': f"{staff.first_name} {staff.last_name}",
            'staff_id': staff.staff_id,
            'restored_roles': restored_role_names
        },
        entity_type='Staff',
        entity_ids=[staff.staff_id]
    )
    
    api_logger.info(f"Staff reactivated: {staff.email} (ID: {staff.staff_id}) by {performed_by_user.email}. Roles restored: {restored_role_names}")
    
    return {
        'status': 'success',
        'message': f'Staff {staff.first_name} {staff.last_name} reactivated successfully',
        'staff_id': staff.staff_id,
        'restored_roles': restored_role_names
    }

def grant_access_to_suspended_users(user_list=None):
    """
    Grant access to suspended users by clearing their deactivation_reason.
    
    Args:
        user_list: List of staff_id or email strings. If None, grants access to ALL suspended users.
    
    Returns:
        dict with count of granted and not found
    """
    from django.db.models import Q
    
    if user_list is None:
        # Grant access to ALL suspended users
        updated_count = Staff.objects.filter(
            deactivation_reason="suspended"
        ).update(deactivation_reason=None)
        return {
            'status': 'success',
            'message': f'Access granted to {updated_count} suspended users',
            'count': updated_count
        }
    else:
        # Grant access to specific users
        granted_count = 0
        not_found = []
        
        for identifier in user_list:
            try:
                # Try as email first, then as staff_id
                staff = Staff.objects.get(
                    Q(email=identifier) | Q(staff_id=identifier)
                )
                if staff.deactivation_reason == "suspended":
                    staff.deactivation_reason = None
                    staff.save()
                    granted_count += 1
                    api_logger.info(f"Access granted to user {staff.email} ({staff.staff_id})")
            except Staff.DoesNotExist:
                not_found.append(identifier)
        
        return {
            'status': 'success',
            'message': f'Access granted to {granted_count} user(s)',
            'granted': granted_count,
            'not_found': not_found
        }

def env_bool(name: str, default=False) -> bool:
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "on")

def check_and_handle_age_maturity(child):
    """
    Check if a child has reached age 16 (maturity threshold).
    If so, automatically set need_review=False and delete all review tasks.
    
    IMPORTANT: Once need_review is set to False due to age (>= 16) or status (בריא/ז״ל),
    it MUST NOT be allowed to revert back to True. This ensures mature children don't get
    review tasks created again.
    
    Parameters:
    - child: Children model instance
    
    Returns:
    - dict: {'mature': bool, 'age': int, 'need_review_changed': bool, 'tasks_deleted': int}
    """
    try:
        from datetime import date
        
        # Calculate age
        today = date.today()
        age = (
            today.year
            - child.date_of_birth.year
            - (
                (today.month, today.day)
                < (child.date_of_birth.month, child.date_of_birth.day)
            )
        )
        
        is_mature = age >= 16
        need_review_changed = False
        tasks_deleted = 0
        
        # If child is mature (age >= 16), set need_review=False and delete review tasks
        if is_mature:
            # Only change need_review if it's currently True
            # Once it's False (for any reason), it should stay False
            if child.need_review:
                child.need_review = False
                child.save(update_fields=['need_review'])
                need_review_changed = True
                
                # Delete all review tasks for this child
                review_task_type = Task_Types.objects.filter(task_type='שיחת ביקורת').first()
                if review_task_type:
                    deleted_result = Tasks.objects.filter(
                        related_child_id=child.child_id,
                        task_type=review_task_type
                    ).delete()
                    tasks_deleted = deleted_result[0]
                    if tasks_deleted > 0:
                        api_logger.info(f"Child {child.child_id} reached age 16: deleted {tasks_deleted} review tasks")
        
        return {
            'mature': is_mature,
            'age': age,
            'need_review_changed': need_review_changed,
            'tasks_deleted': tasks_deleted
        }
    except Exception as e:
        api_logger.error(f"Error checking age maturity for child {child.child_id}: {str(e)}")
        return {
            'mature': False,
            'age': 0,
            'need_review_changed': False,
            'tasks_deleted': 0,
            'error': str(e)
        }
