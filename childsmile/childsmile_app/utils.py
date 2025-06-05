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

DISTANCES_FILE = os.path.join(os.path.dirname(__file__), "distances.json")
LOCATIONS_FILE = os.path.join(os.path.dirname(__file__), "locations.json")

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
                locations[city] = {
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                }
                with open(LOCATIONS_FILE, "w", encoding="utf-8") as file:
                    json.dump(locations, file, ensure_ascii=False, indent=4)
                return locations[city]
        except GeocoderTimedOut:
            print(
                f"DEBUG: Geocoding timed out for city '{city}', retrying ({attempt + 1}/{retries})..."
            )
            sleep(delay)

    # If geocoding fails, return None
    print(f"DEBUG: Failed to geocode city '{city}' after {retries} retries.")
    return {"latitude": None, "longitude": None}


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