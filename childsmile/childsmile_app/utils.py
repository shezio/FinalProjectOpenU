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
from django.db.models import Count, F
import tempfile
import shutil
from filelock import FileLock

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def get_enum_values(enum_type):
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT unnest(enum_range(NULL::{enum_type}))")
        return [row[0] for row in cursor.fetchall()]

def get_or_update_city_location(city, retries=3, delay=2):
    """
    Retrieve the latitude and longitude of a city from the DB.
    If the city is not found, geocode it and update the DB.
    """
    # Try to find any record where city is city1 or city2
    geo = CityGeoDistance.objects.filter(city1=city).first() or CityGeoDistance.objects.filter(city2=city).first()
    if geo:
        if geo.city1 == city and geo.city1_latitude and geo.city1_longitude:
            return {"latitude": geo.city1_latitude, "longitude": geo.city1_longitude}
        if geo.city2 == city and geo.city2_latitude and geo.city2_longitude:
            return {"latitude": geo.city2_latitude, "longitude": geo.city2_longitude}

    # If not found, geocode and store in DB
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
        except Exception as e:
            print(f"Geocoding failed for city '{city}': {e} (attempt {attempt+1})")
        time.sleep(delay)
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
    """
    query = """
    SELECT
        child.child_id,
        tutor.id_id AS tutor_id,
        CONCAT(child.childfirstname, ' ', child.childsurname) AS child_full_name,
        CONCAT(signedup.first_name, ' ', signedup.surname) AS tutor_full_name,
        child.city AS child_city,
        signedup.city AS tutor_city,
        EXTRACT(YEAR FROM AGE(current_date, child.date_of_birth))::int AS child_age,
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
    WHERE NOT EXISTS (
        SELECT 1
        FROM childsmile_app_tutorships tutorship
        WHERE tutorship.child_id = child.child_id or tutorship.tutor_id = tutor.id_id
    )
    AND child.status <> 'בריא';
    """
    with connection.cursor() as cursor:
        cursor.execute(query)
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
                "child_age": row[6],
                "tutor_age": row[7],
                "child_gender": row[8],
                "tutor_gender": row[9],
                "distance_between_cities": row[10],
                "grade": row[11],
                "is_used": row[12],
            }
            for row in rows
        ]


def clear_possible_matches():
    """
    Clear the possible matches table.
    This function deletes all records from the PossibleMatches table.
    """
    PossibleMatches.objects.all().delete()
    # print("DEBUG: Emptied the possiblematches table.")


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
    print(f"DEBUG: Inserted {len(new_matches)} new records into possiblematches.")


def calculate_distances(matches):
    """
    Calculate distances and coordinates between child and tutor cities in the matches.
    :param matches: List of match objects, each containing child_city and tutor_city.
    :return: List of matches with calculated distances and coordinates.
    """
    for match in matches:
        # print(f"DEBUG: Processing match: {match}")  # Log the match being processed
        result = calculate_distance_between_cities(
            match["child_city"], match["tutor_city"]
        )
        # print(
        #     f"DEBUG: Result from calculate_distance_between_cities: {result}"
        # )  # Log the result

        if result:
            try:
                match["distance_between_cities"] = result["distance"]
                match["child_latitude"] = result["city1_latitude"]
                match["child_longitude"] = result["city1_longitude"]
                match["tutor_latitude"] = result["city2_latitude"]
                match["tutor_longitude"] = result["city2_longitude"]
                match["distance_pending"] = result.get("distance_pending", False)
            except KeyError as e:
                print(f"DEBUG: KeyError while accessing result: {e}")
                raise
        else:
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
    print(f"DEBUG: Calculating distance between {city1} and {city2}")

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

        # if tutor_id == 845121544:
        #     print(f"\nDEBUG: Calculating grade for tutor_id={tutor_id}")
        #     print(f"  Initial base_grade: {base_grade}")

        # Adjust grade based on age difference
        child_age = match.get("child_age")
        tutor_age = match.get("tutor_age")
        age_difference = abs(child_age - tutor_age)
        # if tutor_id == 845121544:
        #     print(f"  child_age: {child_age}, tutor_age: {tutor_age}, age_difference: {age_difference}")

        if age_difference < low_age_difference:
            base_grade += max_age_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{max_age_bonus} (age diff < {low_age_difference}) => {base_grade}")
        elif age_difference < mid_age_difference:
            base_grade += mid_age_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{mid_age_bonus} (age diff < {mid_age_difference}) => {base_grade}")
        elif age_difference < high_age_difference:
            base_grade += low_age_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{low_age_bonus} (age diff < {high_age_difference}) => {base_grade}")

        # Adjust grade based on distance
        distance = match.get("distance_between_cities")
        # if tutor_id == 845121544:
        #     print(f"  distance: {distance}")
        if distance < low_distance_diff:
            base_grade += max_distance_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{max_distance_bonus} (distance < {low_distance_diff}) => {base_grade}")
        elif distance < mid_distance_diff:
            base_grade += mid_distance_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{mid_distance_bonus} (distance < {mid_distance_diff}) => {base_grade}")
        elif distance < high_distance_diff:
            base_grade += low_distance_bonus
            # if tutor_id == 845121544:
            #     print(f"  +{low_distance_bonus} (distance < {high_distance_diff}) => {base_grade}")
        elif distance > penalty_distance_diff:
            base_grade = high_distance_penalty
            # if tutor_id == 845121544:
            #     print(
            #         f"  Setting grade to {high_distance_penalty} (distance > {penalty_distance_diff})"
            #     )

        # Ensure the grade is within the allowed range and if its not fix it
        # if its less than -5 we will set it to -5, if its more than 100 we will set it to 100
        base_grade = max(high_distance_penalty, min(base_grade, max_grade))

        # if tutor_id == 845121544:
        #     print(f"  Final base_grade: {ceil(base_grade)}")

        # Add the calculated grade to the match object - rounded up to the nearest whole number
        match["grade"] = ceil(base_grade)

    return possible_matches


def parse_date_field(date_value, field_name):
    """
    Parse a date field and return a valid date or None if the value is empty or invalid.
    """
    if date_value in [None, "", "null"]:
        print(f"DEBUG: {field_name} is empty or null.")
        return None
    try:
        parsed_date = datetime.datetime.strptime(date_value, "%Y-%m-%d").date()
        print(f"DEBUG: {field_name} parsed successfully: {parsed_date}")
        return parsed_date
    except ValueError:
        print(f"DEBUG: {field_name} has an invalid date format: {date_value}")
        return None  # Return None instead of raising an exception


def create_task_internal(task_data):
    """
    Internal function to create a task.
    """
    try:
        print(f"DEBUG: Received task_data: {task_data}")  # Log the incoming data

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
        print(f"DEBUG: Task type fetched: {task_type.task_type}")

        initial_family_data_id = task_data.get("initial_family_data_id_fk")
        initial_family_data = None
        if initial_family_data_id:
            initial_family_data = InitialFamilyData.objects.get(
                pk=initial_family_data_id
            )

        task = Tasks.objects.create(
            description=task_type.task_type,  # Use the task type name as the description
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
        )
        print(f"DEBUG: Task created successfully: {task}")
        return task
    except Task_Types.DoesNotExist:
        print("DEBUG: Invalid task type ID.")
        raise ValueError("Invalid task type ID.")
    except Exception as e:
        print(f"DEBUG: Error creating task: {str(e)}")
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
                print(
                    f"DEBUG: Pending_Tutor with ID {pending_tutor_id} found in the database."
                )
                create_tasks_for_tutor_coordinators(pending_tutor_id, task_type_id)
                return
            print(
                f"DEBUG: Pending_Tutor with ID {pending_tutor_id} not found. Retrying in {retry_interval} seconds..."
            )
            time.sleep(retry_interval)
            elapsed_time += retry_interval

        print(
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
            print("DEBUG: Role 'Tutors Coordinator' not found in the database.")
            return

        # Fetch all tutor coordinators
        tutor_coordinators = Staff.objects.filter(roles=tutor_coordinator_role)
        if not tutor_coordinators.exists():
            print("DEBUG: No Tutors Coordinators found in the database.")
            return

        print(f"DEBUG: Found {tutor_coordinators.count()} Tutors Coordinators.")

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

            print(f"DEBUG: Task data being sent to create_task_internal: {task_data}")

            try:
                task = create_task_internal(task_data)
                print(f"DEBUG: Task created successfully with ID {task.task_id}")
            except Exception as e:
                print(f"DEBUG: Error creating task: {str(e)}")
    except Exception as e:
        print(f"DEBUG: An error occurred while creating tasks: {str(e)}")


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
            print("DEBUG: Role 'Technical Coordinator' not found in the database.")
            return

        # Fetch all Technical Coordinators (roles is a many-to-many field)
        tech_coordinators = Staff.objects.filter(roles=tech_coordinator_role)
        if not tech_coordinators.exists():
            print("DEBUG: No Technical Coordinators found in the database.")
            return

        print(f"DEBUG: Found {tech_coordinators.count()} Technical Coordinators.")

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
            print(f"DEBUG: Task data being sent to create_task_internal: {task_data}")
            try:
                task = create_task_internal(task_data)
                print(f"DEBUG: Task created successfully with ID {task.task_id}")
            except Exception as e:
                print(f"DEBUG: Error creating task: {str(e)}")
    except Exception as e:
        print(f"DEBUG: An error occurred while creating tasks: {str(e)}")


def is_admin(user):
    """
    Check if the given user is an admin.
    """
    with connection.cursor() as cursor:
        role_ids = list(user.roles.values_list("id", flat=True))  # Convert to a list
        print(f"DEBUG: Role IDs for user '{user.username}': {role_ids}")  # Debug log
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
        print(
            f"DEBUG: Is user '{user.username}' an admin? {is_admin_result}"
        )  # Debug log
        return is_admin_result


def has_permission(request, resource, action):
    """
    Check if the user has the required permission for a specific resource and action.
    """
    permissions = request.session.get("permissions", [])
    # print the permissions for debugging
    # print(f"DEBUG: Permissions: {permissions}")  # Debug log
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
    # print the permissions for debugging
    # print(f"DEBUG: Permissions: {permissions}")  # Debug log
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
    """
    print(
        f"DEBUG: [FORCE] Calculating and storing distance between {city1} and {city2}"
    )

    # Ensure both cities have coordinates
    loc1 = get_or_update_city_location(city1)
    loc2 = get_or_update_city_location(city2)
    if not loc1 or not loc1.get("latitude") or not loc2 or not loc2.get("latitude"):
        print(f"DEBUG: [FORCE] Could not geocode one or both cities: {city1}, {city2}")
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

    print(
        f"DEBUG: [FORCE] Calculated and saved distance for {city1} and {city2}: {distance} km"
    )

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

