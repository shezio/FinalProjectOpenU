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

DISTANCES_FILE = os.path.join(os.path.dirname(__file__), "distances.json")
LOCATIONS_FILE = os.path.join(os.path.dirname(__file__), "locations.json")

def get_or_update_city_location(city, retries=3, delay=2):
    """
    Retrieve the latitude and longitude of a city from the LOCATIONS_FILE.
    If the city is not found, geocode it and update the file.
    """
    # Ensure the file exists and is properly formatted
    if not os.path.exists(LOCATIONS_FILE):
        with open(LOCATIONS_FILE, "w", encoding="utf-8") as file:
            json.dump({}, file, ensure_ascii=False, indent=4)

    # Load locations from the JSON file
    with open(LOCATIONS_FILE, "r", encoding="utf-8") as file:
        try:
            locations = json.load(file)
        except json.JSONDecodeError:
            locations = {}

    # Check if the city is already in the file
    if city in locations:
        return locations[city]  # Return cached location

    # Geocode the city if not found in the file
    geolocator = Nominatim(user_agent="childsmile", timeout=5)
    for attempt in range(retries):
        try:
            location = geolocator.geocode(city)
            if location:
                # Save the geocoded location to the file
                locations[city] = {"latitude": location.latitude, "longitude": location.longitude}
                with open(LOCATIONS_FILE, "w", encoding="utf-8") as file:
                    json.dump(locations, file, ensure_ascii=False, indent=4)
                return locations[city]
        except GeocoderTimedOut:
            print(f"DEBUG: Geocoding timed out for city '{city}', retrying ({attempt + 1}/{retries})...")
            sleep(delay)

    # If geocoding fails, return None
    print(f"DEBUG: Failed to geocode city '{city}' after {retries} retries.")
    return {"latitude": None, "longitude": None}

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

    for permission in required_permissions:
        if not has_permission(request, "possiblematches", permission):
            raise PermissionError(f"You do not have {permission} permission.")


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
    );
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
        print(f"DEBUG: Processing match: {match}")  # Log the match being processed
        result = calculate_distance_between_cities(
            match["child_city"], match["tutor_city"]
        )
        print(
            f"DEBUG: Result from calculate_distance_between_cities: {result}"
        )  # Log the result

        if result:
            try:
                match["distance_between_cities"] = result["distance"]
                match["child_latitude"] = result["city1_latitude"]
                match["child_longitude"] = result["city1_longitude"]
                match["tutor_latitude"] = result["city2_latitude"]
                match["tutor_longitude"] = result["city2_longitude"]
            except KeyError as e:
                print(f"DEBUG: KeyError while accessing result: {e}")
                raise
        else:
            match["distance_between_cities"] = 0
            match["child_latitude"] = None
            match["child_longitude"] = None
            match["tutor_latitude"] = None
            match["tutor_longitude"] = None
    return matches


# helper function to calculate distance between 2 cities in Israel
# cities come in hebrew names, we need to return the distance in km
def calculate_distance_between_cities(city1, city2):
    """
    Calculate the distance between two cities in kilometers and return their coordinates.
    First, check the distances.json file for the distance and coordinates.
    If not found, calculate the distance, add it to the file, and return it.
    """
    print(f"DEBUG: Calculating distance between {city1} and {city2}")

    # Ensure the file exists and is properly formatted
    if not os.path.exists(DISTANCES_FILE):
        with open(DISTANCES_FILE, "w", encoding="utf-8") as file:
            json.dump({}, file, ensure_ascii=False, indent=4)

    # Load distances from the JSON file
    with open(DISTANCES_FILE, "r", encoding="utf-8") as file:
        try:
            distances = json.load(file)
        except json.JSONDecodeError:
            distances = {}

    # Check if city1 exists in the file
    if city1 in distances:
        city1_data = distances[city1]
        # Check if city2 exists under city1
        if city2 in city1_data:
            print(
                f"DEBUG: Found distance for {city1} and {city2}: {city1_data[city2]['distance']} km"
            )
            return {
                "distance": city1_data[city2]["distance"],
                "city1_latitude": distances[city1]["city_latitude"],
                "city1_longitude": distances[city1]["city_longitude"],
                "city2_latitude": city1_data[city2]["city2_latitude"],
                "city2_longitude": city1_data[city2]["city2_longitude"],
            }
    else:
        # Initialize city1 data if not present
        distances[city1] = {}

    # Geocode city1 if its coordinates are not already stored
    if (
        "city_latitude" not in distances[city1]
        or "city_longitude" not in distances[city1]
    ):
        geolocator = Nominatim(user_agent="childsmile", timeout=5)
        location1 = geolocator.geocode(city1)
        if location1:
            distances[city1]["city_latitude"] = location1.latitude
            distances[city1]["city_longitude"] = location1.longitude
        else:
            print(f"DEBUG: Could not geocode {city1}")
            return {
                "distance": 0,
                "city1_latitude": None,
                "city1_longitude": None,
                "city2_latitude": None,
                "city2_longitude": None,
            }

    # Geocode city2
    geolocator = Nominatim(user_agent="childsmile", timeout=5)
    location2 = geolocator.geocode(city2)
    if location2:
        lat1, lon1 = (
            distances[city1]["city_latitude"],
            distances[city1]["city_longitude"],
        )
        lat2, lon2 = location2.latitude, location2.longitude

        # Haversine formula
        R = 6371  # Radius of the Earth in kilometers
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = (sin(dlat / 2) ** 2) + cos(radians(lat1)) * cos(radians(lat2)) * (
            sin(dlon / 2) ** 2
        )
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = ceil(R * c)  # Round up to the nearest whole number

        # Save city2 data under city1
        distances[city1][city2] = {
            "distance": distance,
            "city2_latitude": lat2,
            "city2_longitude": lon2,
        }

        # Save the updated distances to the file
        with open(DISTANCES_FILE, "w", encoding="utf-8") as file:
            json.dump(distances, file, ensure_ascii=False, indent=4)

        print(
            f"DEBUG: Calculated and saved distance for {city1} and {city2}: {distance} km"
        )
        return {
            "distance": distance,
            "city1_latitude": lat1,
            "city1_longitude": lon1,
            "city2_latitude": lat2,
            "city2_longitude": lon2,
        }
    else:
        print(f"DEBUG: Could not geocode {city2}")
        return {
            "distance": 0,
            "city1_latitude": distances[city1]["city_latitude"],
            "city1_longitude": distances[city1]["city_longitude"],
            "city2_latitude": None,
            "city2_longitude": None,
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
        )
        print(f"DEBUG: Task created successfully: {task}")
        return task
    except Task_Types.DoesNotExist:
        print("DEBUG: Invalid task type ID.")
        raise ValueError("Invalid task type ID.")
    except Exception as e:
        print(f"DEBUG: Error creating task: {str(e)}")
        raise e


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


def delete_task_cache(assigned_to_id=None, is_admin=False):
    """
    Delete the cache for tasks.
    If is_admin is True, it clears the cache for all tasks (admin cache).
    If assigned_to_id is provided, it clears the cache for that specific user.
    """
    if is_admin:
        cache.delete("all_tasks")  # Clear the admin cache
    elif assigned_to_id:
        user_cache_key = f"user_tasks_{assigned_to_id}"
        cache.delete(user_cache_key)  # Clear the cache for the specific user


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


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


@csrf_exempt  # Disable CSRF (makes things easier)
@api_view(["POST"])
def login_view(request):
    username = request.data.get("username")
    password = request.data.get("password")

    try:
        user = Staff.objects.get(username=username)
        if user.password == password:  # No hashing, just compare

            # Parse roles as a Python list
            user_roles = list(user.roles.all()) if user.roles else []
            print(f"DEBUG: the user roles for user '{username}' are : {user_roles}")

            # Check if the user has any roles
            if not user_roles:  # If roles is an empty list
                print(f"DEBUG: User '{username}' has no roles.")
                return JsonResponse(
                    {
                        "error": "Please wait until you get permissions from your coordinator."
                    },
                    status=401,
                )
            request.session.create()  # Create session
            request.session["user_id"] = user.staff_id
            request.session["username"] = user.username
            request.session.set_expiry(86400)  # 1 day expiry

            response = JsonResponse({"message": "Login successful!"})
            response.set_cookie(
                "sessionid", request.session.session_key, httponly=True, samesite="Lax"
            )
            return response
        else:
            return JsonResponse({"error": "Invalid password"}, status=400)

    except Staff.DoesNotExist:
        return JsonResponse({"error": "Invalid username"}, status=400)


@api_view(["GET"])
def get_permissions(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch permissions from the database
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 
                p.permission_id, 
                p.resource, 
                p.action
            FROM childsmile_app_staff_roles sr
            JOIN childsmile_app_permissions p ON sr.role_id = p.role_id
            WHERE sr.staff_id = %s
            """,
            [user_id],
        )
        permissions = cursor.fetchall()

    # Format permissions as a list of dictionaries
    permissions_data = [
        {"permission_id": row[0], "resource": row[1], "action": row[2]}
        for row in permissions
    ]

    # Store permissions in the session
    request.session["permissions"] = permissions_data
    return JsonResponse({"permissions": permissions_data})


@csrf_exempt  # Disable CSRF (makes things easier)
@api_view(["POST"])
def logout_view(request):
    try:
        request.session.flush()  # Clear the session for the logged-in user
        return JsonResponse({"message": "Logout successful!"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@api_view(["GET"])
def get_user_tasks(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Fetch the user
    user = Staff.objects.get(staff_id=user_id)
    print(f"DEBUG: Logged-in user: {user.username}")  # Debug log

    # Check if the user is an admin
    user_is_admin = is_admin(user)
    print(f"DEBUG: Is user '{user.username}' an admin? {user_is_admin}")  # Debug log

    # Use cache to avoid repeated queries
    cache_key = f"user_tasks_{user_id}" if not user_is_admin else "all_tasks"
    tasks_data = cache.get(cache_key)

    if not tasks_data:
        # Fetch tasks efficiently
        if user_is_admin:
            # print("DEBUG: Fetching all tasks for admin user.")  # Debug log
            tasks = (
                Tasks.objects.all()
                .select_related("task_type", "assigned_to", "pending_tutor__id")
                .order_by("-updated_at")
            )
        else:
            print(
                f"DEBUG: Fetching tasks assigned to user '{user.username}'."
            )  # Debug log
            tasks = (
                Tasks.objects.filter(assigned_to_id=user_id)
                .select_related("task_type", "assigned_to", "pending_tutor__id")
                .order_by("-updated_at")
            )

        tasks_data = [
            {
                "id": task.task_id,
                "description": task.description,
                "due_date": task.due_date.strftime("%d/%m/%Y"),
                "status": task.status,
                "created": task.created_at.strftime("%d/%m/%Y"),
                "updated": task.updated_at.strftime("%d/%m/%Y"),
                "assignee": task.assigned_to.username,
                "child": task.related_child_id,
                "tutor": task.related_tutor_id,
                "type": task.task_type_id,
                "pending_tutor": (
                    {
                        "id": task.pending_tutor.id_id,
                        "first_name": task.pending_tutor.id.first_name,
                        "surname": task.pending_tutor.id.surname,
                    }
                    if task.pending_tutor
                    else None
                ),  # Serialize Pending_Tutor details or set to None
            }
            for task in tasks
        ]
        cache.set(cache_key, tasks_data, timeout=300)  # Cache for 5 minutes

    # Fetch task types only once
    task_types_data = cache.get("task_types_data")
    if not task_types_data:
        task_types = Task_Types.objects.all()
        task_types_data = [{"id": t.id, "name": t.task_type} for t in task_types]
        cache.set("task_types_data", task_types_data, timeout=300)

    return JsonResponse({"tasks": tasks_data, "task_types": task_types_data})


@csrf_exempt
@api_view(["GET"])
def get_staff(request):
    """
    Retrieve all staff along with their roles.
    """
    staff = Staff.objects.all()
    staff_data = []

    for user in staff:
        # Fetch role names for each staff member
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.role_name
                FROM childsmile_app_staff_roles sr
                JOIN childsmile_app_role r ON sr.role_id = r.id
                WHERE sr.staff_id = %s
                """,
                [user.staff_id],
            )
            roles = [row[0] for row in cursor.fetchall()]  # Fetch role names

        staff_data.append(
            {
                "id": user.staff_id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "roles": roles,  # Include role names instead of IDs
            }
        )

    return JsonResponse({"staff": staff_data})


@csrf_exempt
@api_view(["GET"])
def get_children(request):
    """
    Retrieve all children along with their tutoring status.
    """
    children = Children.objects.all()
    children_data = [
        {
            "id": c.child_id,
            "first_name": c.childfirstname,
            "last_name": c.childsurname,
            "tutoring_status": c.tutoring_status,
        }
        for c in children
    ]
    return JsonResponse({"children": children_data})


@csrf_exempt
@api_view(["GET"])
def get_tutors(request):
    """
    Retrieve all tutors along with their tutorship status.
    """
    tutors = Tutors.objects.select_related("staff").all()
    tutors_data = [
        {
            "id": t.id_id,  # ה-ID של המדריך בטבלת Tutors
            "first_name": t.staff.first_name,  # נתונים מטבלת Staff
            "last_name": t.staff.last_name,
            "tutorship_status": t.tutorship_status,
        }
        for t in tutors
    ]

    return JsonResponse({"tutors": tutors_data})


@csrf_exempt
@api_view(["POST"])
def create_task(request):
    """
    Create a new task.
    """
    print(" create task data: ", request.data)  # Debug log
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    task_data = request.data
    try:
        # Handle `assigned_to` field
        assigned_to = task_data.get("assigned_to")
        if assigned_to:
            try:
                # Check if `assigned_to` is a numeric ID or a username
                if str(assigned_to).isdigit():
                    # If it's numeric, treat it as `staff_id`
                    assigned_to_staff = Staff.objects.get(staff_id=assigned_to)
                else:
                    # Otherwise, treat it as a `username`
                    assigned_to_staff = Staff.objects.get(username=assigned_to)

                # Replace `assigned_to` with the `staff_id`
                task_data["assigned_to"] = assigned_to_staff.staff_id
            except Staff.DoesNotExist:
                return JsonResponse(
                    {"detail": f"Staff member with ID or username '{assigned_to}' not found."},
                    status=400,
                )

        print(f"DEBUG: Task data being sent to create_task_internal: {task_data}")
        task = create_task_internal(task_data)

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # Invalidate the cache for tasks
        delete_task_cache(task.assigned_to_id, is_admin=is_admin(user))

        return JsonResponse({"task_id": task.task_id}, status=201)
    except Task_Types.DoesNotExist:
        return JsonResponse({"detail": "Invalid task type ID."}, status=400)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"detail": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_task(request, task_id):
    """
    Delete a task.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tasks" resource
    if not has_permission(request, "tasks", "DELETE"):
        return JsonResponse(
            {"error": "You do not have permission to delete tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)
        assigned_to_id = task.assigned_to_id
        task.delete()

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # Invalidate the cache for tasks
        delete_task_cache(assigned_to_id, is_admin=is_admin(user))

        return JsonResponse({"message": "Task deleted successfully."}, status=200)
    except Tasks.DoesNotExist:
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_task_status(request, task_id):
    """
    Update the status of a task.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tasks" resource
    if not has_permission(request, "tasks", "UPDATE"):
        return JsonResponse(
            {"error": "You do not have permission to update tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)
        task.status = request.data.get("status", task.status)
        task.save()

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # Invalidate the cache for tasks
        delete_task_cache(task.assigned_to_id, is_admin=is_admin(user))

        return JsonResponse(
            {"message": "Task status updated successfully."}, status=200
        )
    except Tasks.DoesNotExist:
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_task(request, task_id):
    """
    Update task details.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tasks" resource
    if not has_permission(request, "tasks", "UPDATE"):
        return JsonResponse(
            {"error": "You do not have permission to update tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)

        # Update task fields
        task.description = request.data.get("description", task.description)
        task.due_date = request.data.get("due_date", task.due_date)
        task.status = request.data.get("status", task.status)
        task.updated_at = datetime.datetime.now()

        # Handle assigned_to (convert staff_id directly)
        assigned_to = request.data.get("assigned_to")
        print(f"DEBUG: assigned_to = {assigned_to}")  # Debug log
        if assigned_to:
            try:
                # Check if assigned_to is a username or staff_id
                if assigned_to.isdigit():
                    # If it's a numeric value, treat it as staff_id
                    staff_member = Staff.objects.get(staff_id=assigned_to)
                else:
                    # Otherwise, treat it as a username
                    staff_member = Staff.objects.get(username=assigned_to)

                task.assigned_to_id = staff_member.staff_id
            except Staff.DoesNotExist:
                print(
                    f"DEBUG: Staff member with username or ID '{assigned_to}' not found."
                )  # Debug log
                return JsonResponse(
                    {
                        "error": f"Staff member with username or ID '{assigned_to}' not found."
                    },
                    status=400,
                )

        # Handle related_child_id
        task.related_child_id = request.data.get("child", task.related_child_id)

        # Handle related_tutor_id
        task.related_tutor_id = request.data.get("tutor", task.related_tutor_id)

        # Handle task_type_id
        task.task_type_id = request.data.get("type", task.task_type_id)

        # Handle pending_tutor_id
        task.pending_tutor_id = request.data.get("pending_tutor", task.pending_tutor_id)

        # Save the updated task
        task.save()

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # Invalidate the cache for tasks
        delete_task_cache(task.assigned_to_id, is_admin=is_admin(user))

        return JsonResponse({"message": "Task updated successfully."}, status=200)
    except Tasks.DoesNotExist:
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def get_families_per_location_report(request):
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
            location = get_or_update_city_location(child.city)  # Use the helper function
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
        print(f"DEBUG: An error occurred: {str(e)}")  # Log the error for debugging
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["GET"])
def families_waiting_for_tutorship_report(request):
    """
    Retrieve a report of families waiting for tutorship, ordered by registration date.
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
        waiting_statuses = [
            "למצוא_חונך",
            "למצוא_חונך_אין_באיזור_שלו",
            "למצוא_חונך_בעדיפות_גבוה",
        ]

        # Get date filters from query parameters
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        # Convert from_date and to_date to timezone-aware datetimes
        if from_date:
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))

        # Fetch children with the specified tutoring statuses, ordered by registration date
        children = Children.objects.filter(tutoring_status__in=waiting_statuses)

        # Apply date filters if provided
        if from_date:
            children = children.filter(registrationdate__gte=from_date)
        if to_date:
            children = children.filter(registrationdate__lte=to_date)

        children = children.order_by("registrationdate").values(
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
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def get_new_families_report(request):
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
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def active_tutors_report(request):
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
        tutorships = Tutorships.objects.select_related("child", "tutor__staff").values(
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


@csrf_exempt
@api_view(["GET"])
def possible_tutorship_matches_report(request):
    """
    Retrieve a report of all possible tutorship matches.
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
        # Fetch all data from the PossibleMatches table
        possible_matches = PossibleMatches.objects.all().values()

        # Convert the data to a list of dictionaries
        possible_matches_data = list(possible_matches)
        print(f"DEBUG: Possible matches data: {possible_matches_data}")  # Debug log

        # Return the data as JSON
        return JsonResponse(
            {"possible_tutorship_matches": possible_matches_data}, status=200
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# next report is volunteer feedback report@csrf_exempt
@api_view(["GET"])
def volunteer_feedback_report(request):
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
                        "feedback_id": feedback.feedback.feedback_id,  # Access the related Feedback table
                        "event_date": feedback.feedback.event_date.strftime("%d/%m/%Y"),
                        "feedback_filled_at": feedback.feedback.timestamp.strftime(
                            "%d/%m/%Y"
                        ),
                        "description": feedback.feedback.description,
                        "exceptional_events": feedback.feedback.exceptional_events,
                        "anything_else": feedback.feedback.anything_else,
                        "comments": feedback.feedback.comments,
                    }
                )
            except Exception as e:
                print(f"DEBUG: Error processing feedback: {feedback}, Error: {str(e)}")

        # Return the data as JSON
        return JsonResponse({"volunteer_feedback": feedbacks_data}, status=200)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")  # Log the error for debugging
        return JsonResponse({"error": str(e)}, status=500)


# next report is tutor feedback report
@csrf_exempt
@api_view(["GET"])
def tutor_feedback_report(request):
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
                    }
                )
            except Exception as e:
                print(f"DEBUG: Error processing feedback: {feedback}, Error: {str(e)}")

        # Return the data as JSON
        return JsonResponse({"tutor_feedback": feedbacks_data}, status=200)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")  # Log the error for debugging
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@transaction.atomic
@api_view(["POST"])
def create_volunteer_or_tutor(request):
    """
    Register a new user as a volunteer or tutor.
    """
    try:
        print(f"DEBUG: Incoming request data: {request.data}")
        # Extract data from the request
        data = request.data  # Use request.data for JSON payloads
        user_id = data.get("id")
        first_name = data.get("first_name")
        surname = data.get("surname")
        age = int(data.get("age"))
        # Convert gender to boolean
        gender = data.get("gender") == "Female"
        phone_prefix = data.get("phone_prefix")
        phone_suffix = data.get("phone_suffix")
        phone = (
            f"{phone_prefix}-{phone_suffix}" if phone_prefix and phone_suffix else None
        )
        city = data.get("city")
        comment = data.get("comment", "")
        email = data.get("email")
        # Convert want_tutor to boolean
        want_tutor = data.get("want_tutor") == "true"

        # Validate required fields
        missing_fields = []
        if not user_id:
            missing_fields.append("id")
        if not first_name:
            missing_fields.append("first_name")
        if not surname:
            missing_fields.append("surname")
        if not age:
            missing_fields.append("age")
        if not phone:
            missing_fields.append("phone")
        if not city:
            missing_fields.append("city")
        if not email:
            missing_fields.append("email")

        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

        # validate ID to have 9 digits
        if not (100000000 <= int(user_id) <= 999999999):
            raise ValueError("ID must be a 9-digit number.")

        # validate user_id to be unique
        if SignedUp.objects.filter(id=user_id).exists():
            raise ValueError("A user with this ID already exists.")

        # Check if a user with the same email already exists
        if SignedUp.objects.filter(email=email).exists():
            raise ValueError("A user with this email already exists.")

        # Check if a staff member with the same username already exists
        username = f"{first_name}_{surname}"
        if Staff.objects.filter(username=username).exists():
            # new username will get a _1 appended to it
            username = f"{username}_1"

        # Insert into SignedUp table
        signedup = SignedUp.objects.create(
            id=user_id,
            first_name=first_name,
            surname=surname,
            age=age,
            gender=gender,
            phone=phone,
            city=city,
            comment=comment,
            email=email,
            want_tutor=want_tutor,
        )

        # Determine the role based on want_tutor
        role_name = "General Volunteer"
        try:
            role = Role.objects.get(role_name=role_name)
        except Role.DoesNotExist:
            raise ValueError(f"Role '{role_name}' not found in the database.")

        # Insert into Staff table
        staff = Staff.objects.create(
            username=username,
            password="1234",  # Replace with hashed password in production
            email=email,
            first_name=first_name,
            last_name=surname,
            created_at=now(),
        )

        staff.roles.add(role)  # Add the role to the staff member
        staff.refresh_from_db()  # Refresh to get the updated staff_id
        print(
            f"DEBUG: Staff created with ID {staff.staff_id} with roles {[role.role_name for role in staff.roles.all()]}"
        )

        # Insert into either General_Volunteer or Pending_Tutor
        if want_tutor:
            pending_tutor = Pending_Tutor.objects.create(
                id_id=signedup.id,
                pending_status="ממתין",  # "Pending" in Hebrew
            )
            pending_tutor_id = (
                pending_tutor.pending_tutor_id
            )  # Get the ID of the new Pending_Tutor
            print(f"DEBUG: Pending_Tutor created with ID {pending_tutor_id}")

            # Fetch the task type ID dynamically
            task_type = Task_Types.objects.filter(
                task_type="ראיון מועמד לחונכות"
            ).first()
            if not task_type:
                raise ValueError(
                    "Task type 'ראיון מועמד לחונכות' not found in the database."
                )

            # Call the task creation function asynchronously
            create_tasks_for_tutor_coordinators_async(pending_tutor_id, task_type.id)

        else:
            General_Volunteer.objects.create(
                id_id=signedup.id,
                staff_id=staff.staff_id,
                signupdate=now().date(),
                comments="",
            )

        return JsonResponse({"message": "User registered successfully."}, status=201)

    except ValueError as ve:
        # Rollback will happen automatically because of @transaction.atomic
        print(f"DEBUG: ValueError: {str(ve)}")
        return JsonResponse({"error": str(ve)}, status=400)

    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["GET"])
def get_pending_tutors(request):
    """
    Retrieve all pending tutors with their full details.
    """
    try:
        pending_tutors = Pending_Tutor.objects.select_related(
            "id"
        ).all()  # `id` is the foreign key to SignedUp
        pending_tutors_data = [
            {
                "id": tutor.pending_tutor_id,
                "signedup_id": tutor.id.id,
                "first_name": tutor.id.first_name,
                "surname": tutor.id.surname,
                "email": tutor.id.email,
                "pending_status": tutor.pending_status,
            }
            for tutor in pending_tutors
        ]
        return JsonResponse({"pending_tutors": pending_tutors_data}, status=200)
    except Exception as e:
        print(f"DEBUG: Error fetching pending tutors: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


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

        return JsonResponse(
            {
                "families": families_data,
                "marital_statuses": marital_statuses_data,
                "tutoring_statuses": tutoring_statuses_data,
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

        # Update childsmile_app_healthy
        Healthy.objects.filter(child_id=child_id).update(
            street_and_apartment_number=data.get(
                "street_and_apartment_number", family.street_and_apartment_number
            ),
            father_name=(
                data.get("father_name", family.father_name)
                if family.father_name
                else None
            ),
            father_phone=(
                data.get("father_phone", family.father_phone)
                if family.father_phone
                else None
            ),
            mother_name=(
                data.get("mother_name", family.mother_name)
                if family.mother_name
                else None
            ),
            mother_phone=(
                data.get("mother_phone", family.mother_phone)
                if family.mother_phone
                else None
            ),
        )

        # Update childsmile_app_matures
        Matures.objects.filter(child_id=child_id).update(
            full_address=data.get(
                "street_and_apartment_number", family.street_and_apartment_number
            )
            + ", "
            + data.get("city", family.city),
            current_medical_state=data.get(
                "current_medical_state", family.current_medical_state
            ),
            when_completed_treatments=parse_date_field(
                data.get("when_completed_treatments"), "when_completed_treatments"
            ),
            parent_name=(
                data.get("father_name", family.father_name)
                if family.father_name
                else (
                    data.get("mother_name", family.mother_name)
                    if family.mother_name
                    else None
                )
            ),
            parent_phone=(
                data.get("father_phone", family.father_phone)
                if family.father_phone
                else (
                    data.get("mother_phone", family.mother_phone)
                    if family.mother_phone
                    else None
                )
            ),
            additional_info=(
                data.get("additional_info", family.additional_info)
                if family.additional_info
                else None
            ),
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

        # delete related records in childsmile_app_healthy
        Healthy.objects.filter(child_id=child_id).delete()

        print(f"DEBUG: Related healthy records for child_id {child_id} deleted.")

        # delete related records in childsmile_app_matures
        Matures.objects.filter(child_id=child_id).delete()

        print(f"DEBUG: Related maturing records for child_id {child_id} deleted.")

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
@api_view(["POST"])
def calculate_possible_matches(request):
    try:
        # Step 1: Check user permissions
        check_matches_permissions(request, ["CREATE", "UPDATE", "DELETE"])
        # print("DEBUG: User has all required permissions.")

        # Step 2: Fetch possible matches
        possible_matches = fetch_possible_matches()
        print(f"DEBUG: Fetched {len(possible_matches)} possible matches.")

        # Step 3: Calculate distances and coordinates
        possible_matches = calculate_distances(possible_matches)
        # print("DEBUG: Calculated distances and coordinates for possible matches.")

        # Step 4: Calculate grades
        graded_matches = calculate_grades(possible_matches)
        print(f"DEBUG: Calculated grades for matches.")

        # Step 5: Clear the possiblematches table
        # print("DEBUG: Clearing possible matches table.")
        clear_possible_matches()

        # Step 6: Insert new matches
        print(f"DEBUG: Inserting {len(graded_matches)} new matches into the database.")
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
            "child__childfirstname",
            "child__childsurname",
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
                "child_firstname": tutorship["child__childfirstname"],
                "child_lastname": tutorship["child__childsurname"],
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

        # Create a new tutorship record in the database
        tutorship = Tutorships.objects.create(
            child_id=data["child_id"],
            tutor_id=data["tutor_id"],
            created_date=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            last_approver=[staff_role_id],  # Initialize with the creator's role ID
            approval_counter=1,  # Start with 1 approver
        )

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
        return JsonResponse({"error": "This role has already approved this tutorship"}, status=400)
    try:
        tutorship.last_approver.append(staff_role_id)
        if tutorship.approval_counter <= 2:
            tutorship.approval_counter = len(tutorship.last_approver)
        else:
            raise ValueError("Approval counter cannot exceed 2")
        tutorship.updated_at = datetime.datetime.now()  # Updated to use datetime now()
        tutorship.save()

        return JsonResponse({"message": "Tutorship updated successfully", "approval_counter": 
        tutorship.approval_counter}, status=200)
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the tutorship: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["GET"])
def get_signedup(request):
    """
    Retrieve all signed-up users.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has VIEW permission on the "signedup" resource
    if not has_permission(request, "signedup", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this page."}, status=401
        )

    try:
        signedup_users = SignedUp.objects.all()
        signedup_data = [
            {
                "id": user.id,
                "first_name": user.first_name,
                "surname": user.surname,
                "age": user.age,
                "gender": user.gender,
                "phone": user.phone,
                "city": user.city,
                "comment": user.comment,
                "email": user.email,
                "want_tutor": user.want_tutor,
            }
            for user in signedup_users
        ]
        return JsonResponse({"signedup_users": signedup_data}, status=200)
    except Exception as e:
        print(f"DEBUG: Error fetching signed-up users: {str(e)}")
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
            return JsonResponse({"error": "Tutorship not found."}, status=404)

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


@csrf_exempt
@api_view(["GET"])
def get_all_staff(request):
    """
    Retrieve all staff along with their roles, with pagination and search.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user is an admin
    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        return JsonResponse(
            {"error": "You do not have permission to view this page."}, status=401
        )

    # Get query parameters for search and pagination
    search_query = request.GET.get("search", "").strip()
    page = int(request.GET.get("page", 1))
    page_size = int(request.GET.get("page_size", 10))

    # Filter staff by search query
    staff = Staff.objects.all()
    if search_query:
        staff = staff.filter(
            models.Q(first_name__icontains=search_query)
            | models.Q(last_name__icontains=search_query)
            | models.Q(email__icontains=search_query)
        )

    # Paginate the results
    total_count = staff.count()
    staff = staff[(page - 1) * page_size : page * page_size]

    staff_data = []
    for user in staff:
        roles = list(user.roles.values_list("role_name", flat=True))
        staff_data.append(
            {
                "id": user.staff_id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "created_at": user.created_at.strftime("%d/%m/%Y"),
                "roles": roles,
            }
        )

    return JsonResponse(
        {"staff": staff_data, "total_count": total_count, "page": page, "page_size": page_size},
        status=200,
    )


@csrf_exempt
@api_view(["PUT"])
def update_staff_member(request, staff_id):
    """
    Update a staff member's details and propagate changes to related tables.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user is an admin
    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        return JsonResponse(
            {"error": "You do not have permission to update this staff member."},
            status=401,
        )

    try:
        # Fetch the existing staff record
        try:
            staff_member = Staff.objects.get(staff_id=staff_id)
        except Staff.DoesNotExist:
            return JsonResponse({"error": "Staff member not found."}, status=404)

        # Extract data from the request
        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            return JsonResponse(
            {"error": f"Missing or empty required fields: {', '.join(missing_fields)}"},
            status=400,
            )

        # Update fields in the Staff table
        old_email = staff_member.email  # Store the old email for reference
        staff_member.username = data.get("username", staff_member.username)
        staff_member.email = data.get("email", staff_member.email)
        staff_member.first_name = data.get("first_name", staff_member.first_name)
        staff_member.last_name = data.get("last_name", staff_member.last_name)
        # update password if provided
        if "password" in data and data["password"].strip():
            staff_member.password = data["password"]
        # Update roles if provided
        if "roles" in data:
            roles = data["roles"]
            print(f"DEBUG: Roles provided: {roles}")  # Log the roles provided
            if isinstance(roles, list):
                staff_member.roles.clear()
                for role_name in roles:  # Expecting role names instead of IDs
                    try:
                        role = Role.objects.get(role_name=role_name)  # Fetch by role_name
                        staff_member.roles.add(role)
                    except Role.DoesNotExist:
                        return JsonResponse(
                            {"error": f"Role with name '{role_name}' does not exist."},
                            status=400,
                        )
            else:
                return JsonResponse(
                    {"error": "Roles should be provided as a list of role names."}, status=400
                )
        # Save the updated staff record
        try:
            staff_member.save()
            print(f"DEBUG: Staff member with ID {staff_id} saved successfully.")
        except DatabaseError as db_error:
            print(f"DEBUG: Database error while saving staff member: {str(db_error)}")
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

        # Propagate email changes to related tables
        if old_email != staff_member.email:
            SignedUp.objects.filter(email=old_email).update(email=staff_member.email)
            Tutors.objects.filter(tutor_email=old_email).update(tutor_email=staff_member.email)

        print(f"DEBUG: Staff member with ID {staff_id} updated successfully.")
        return JsonResponse(
            {
                "message": "Staff member updated successfully",
                "staff_id": staff_member.staff_id,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the staff member: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_staff_member(request, staff_id):
    """
    Delete a staff member and all related data from the database.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user is an admin
    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        return JsonResponse(
            {"error": "You do not have permission to delete this staff member."},
            status=401,
        )

    try:
        # Fetch the existing staff record
        try:
            staff_member = Staff.objects.get(staff_id=staff_id)
        except Staff.DoesNotExist:
            return JsonResponse({"error": "Staff member not found."}, status=404)

        # Delete related data
        # 1. Delete SignedUp record if it exists
        SignedUp.objects.filter(email=staff_member.email).delete()

        # 2. Delete General_Volunteer record if it exists
        General_Volunteer.objects.filter(staff=staff_member).delete()

        # 3. Delete Pending_Tutor record if it exists
        Pending_Tutor.objects.filter(id__email=staff_member.email).delete()

        # 4. Delete Tutors record if it exists
        Tutors.objects.filter(staff=staff_member).delete()

        # 5. Delete Tutorships related to the Tutors record
        Tutorships.objects.filter(tutor__staff=staff_member).delete()

        # 6. Delete Tasks assigned to the staff member
        Tasks.objects.filter(assigned_to=staff_member).delete()

        # Finally, delete the staff record
        staff_member.delete()

        print(f"DEBUG: Staff member with ID {staff_id} and related data deleted successfully.")
        return JsonResponse(
            {"message": "Staff member and related data deleted successfully", "staff_id": staff_id},
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while deleting the staff member: {e}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@api_view(["GET"])
def get_roles(request):
    """
    Retrieve all roles from the database.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user is an admin
    if not has_permission(request, "role", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to view this page."}, status=401
        )

    try:
        roles = Role.objects.all()
        roles_data = [{"id": role.id, "role_name": role.role_name} for role in roles]
        return JsonResponse({"roles": roles_data}, status=200)
    except Exception as e:
        print(f"DEBUG: Error fetching roles: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
    
@csrf_exempt
@api_view(["POST"])
def create_staff_member(request):
    """
    Create a new staff member and assign roles.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user is an admin
    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        return JsonResponse(
            {"error": "You do not have permission to create a staff member."},
            status=401,
        )

    try:
        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = ["username", "password", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not data.get(field, "").strip()
        ]
        if missing_fields:
            return JsonResponse(
            {"error": f"Missing or empty required fields: {', '.join(missing_fields)}"},
            status=400,
            )

        # Create a new staff record in the database
        staff_member = Staff.objects.create(
            username=data["username"],
            password=data["password"],  # Assuming password is provided in the request
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
        )

        # Assign roles to the staff member
        roles = data["roles"]
        print(f"DEBUG: Roles provided: {roles}")  # Log the roles provided
        if isinstance(roles, list):
            staff_member.roles.clear()
            for role_name in roles:  # Expecting role names instead of IDs
                try:
                    role = Role.objects.get(role_name=role_name)  # Fetch by role_name
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    return JsonResponse(
                        {"error": f"Role with name '{role_name}' does not exist."},
                        status=400,
                    )
        else:
            return JsonResponse(
                {"error": "Roles should be provided as a list of role names."}, status=400
            )
        print(f"DEBUG: Staff member created successfully with ID {staff_member.staff_id}")
        return JsonResponse(
            {
                "message": "Staff member created successfully",
                "staff_id": staff_member.staff_id,
            },
            status=201,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while creating a staff member: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)