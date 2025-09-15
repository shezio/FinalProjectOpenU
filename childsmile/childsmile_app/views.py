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
    TutorshipStatus,
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
            "preferences": t.preferences,
            "tutor_email": t.tutor_email,
            "relationship_status": t.relationship_status,
            "tutee_wellness": t.tutee_wellness,
            "updated": t.updated,  # The new 'updated' field
        }
        for t in tutors
    ]
    # add tutorship_status_options to the response
    # Use TutorshipStatus.choices for the dropdown options
    status_options = [choice[0] for choice in TutorshipStatus.choices]
    return JsonResponse({"tutors": tutors_data, "tutorship_status_options": status_options})

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

        # validate ID to have exactly 9 digits (including leading zeros)
        if not (isinstance(user_id, str) and user_id.isdigit() and len(user_id) == 9):
            raise ValueError("ID must be a 9-digit number (can include leading zeros).")

        # validate user_id to be unique
        if SignedUp.objects.filter(id=user_id).exists():
            raise ValueError("A user with this ID already exists.")

        # Check if a user with the same email already exists
        if SignedUp.objects.filter(email=email).exists():
            raise ValueError("A user with this email already exists.")

        # Check if a staff member with the same username already exists
        username = f"{first_name}_{surname}"
        index = 1
        original_username = username
        while Staff.objects.filter(username=username).exists():
            username = f"{original_username}_{index}"
            index += 1

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

        return JsonResponse(
            {
                "message": "User registered successfully.",
                "username": username,
            },
            status=201,
        )

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
        {
            "staff": staff_data,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
        },
        status=200,
    )


@csrf_exempt
@api_view(["PUT"])
def update_staff_member(request, staff_id):
    """
    Update a staff member's details and propagate changes to related tables.
    Handles role transitions between General Volunteer and Tutor.
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

        data = request.data  # Use request.data for JSON payloads

        # Validate required fields
        required_fields = ["username", "email", "first_name", "last_name"]
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

        # Check if username already exists
        if (
            Staff.objects.filter(username=data["username"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        # Check if email already exists
        if (
            Staff.objects.filter(email=data["email"])
            .exclude(staff_id=staff_id)
            .exists()
        ):
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
            )

        old_email = staff_member.email  # Store the old email for reference

        # --- Handle role transitions BEFORE changing email ---
        if "roles" in data:
            roles = data["roles"]
            if isinstance(roles, list):
                if "General Volunteer" in roles and "Tutor" in roles:
                    return JsonResponse(
                        {
                            "error": "Cannot assign both 'General Volunteer' and 'Tutor' roles to the same staff member."
                        },
                        status=400,
                    )
            prev_roles = set(staff_member.roles.values_list("role_name", flat=True))
            new_roles = set(data["roles"])

            # General Volunteer -> Tutor
            if (
                "Tutor" in new_roles
                and "General Volunteer" in prev_roles
                and "General Volunteer" not in new_roles
            ):
                gv = General_Volunteer.objects.filter(staff=staff_member).first()
                if gv:
                    id_id = gv.id_id
                    signedup = SignedUp.objects.filter(id=id_id).first()
                    tutor_email = signedup.email if signedup else old_email
                    gv.delete()  # Delete first to avoid unique constraint error
                    Tutors.objects.create(
                        id_id=id_id,
                        staff=staff_member,
                        tutorship_status="ממתין",
                        tutor_email=tutor_email,
                    )

            # Tutor -> General Volunteer
            if (
                "General Volunteer" in new_roles
                and "Tutor" in prev_roles
                and "Tutor" not in new_roles
            ):
                tutor = Tutors.objects.filter(staff=staff_member).first()
                if tutor:
                    id_id = tutor.id_id
                    tutor.delete()  # Delete first to avoid unique constraint error
                    General_Volunteer.objects.create(
                        id_id=id_id,
                        staff=staff_member,
                        signupdate=now().date(),
                        comments="",
                    )

        # --- Now update staff fields (including email) ---
        staff_member.username = data.get("username", staff_member.username)
        staff_member.first_name = data.get("first_name", staff_member.first_name)
        staff_member.last_name = data.get("last_name", staff_member.last_name)
        # update password if provided
        if "password" in data and data["password"].strip():
            staff_member.password = data["password"]

        # Update roles if provided
        if "roles" in data:
            roles = data["roles"]
            if isinstance(roles, list):
                staff_member.roles.clear()
                for role_name in roles:
                    try:
                        role = Role.objects.get(role_name=role_name)
                        staff_member.roles.add(role)
                    except Role.DoesNotExist:
                        return JsonResponse(
                            {"error": f"Role with name '{role_name}' does not exist."},
                            status=400,
                        )
            else:
                return JsonResponse(
                    {"error": "Roles should be provided as a list of role names."},
                    status=400,
                )

        # --- Propagate email changes to related tables (after role transitions) ---
        if old_email != data["email"]:
            SignedUp.objects.filter(email=old_email).update(email=data["email"])
            Tutors.objects.filter(tutor_email=old_email).update(
                tutor_email=data["email"]
            )
            staff_member.email = data["email"]

        # Save the updated staff record
        try:
            staff_member.save()
        except DatabaseError as db_error:
            return JsonResponse(
                {"error": f"Database error: {str(db_error)}"}, status=500
            )

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

    # check if the user tries to delete himself
    if staff_id == user_id:
        return JsonResponse(
            {"error": "You cannot delete yourself."},
            status=406,
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

        print(
            f"DEBUG: Staff member with ID {staff_id} and related data deleted successfully."
        )
        return JsonResponse(
            {
                "message": "Staff member and related data deleted successfully",
                "staff_id": staff_id,
            },
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
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Check if username already exists
        if Staff.objects.filter(username=data["username"]).exists():
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        # Check if email already exists
        if Staff.objects.filter(email=data["email"]).exists():
            return JsonResponse(
                {"error": f"Email '{data['email']}' already exists."}, status=400
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
            if "General Volunteer" in roles or "Tutor" in roles:
                return JsonResponse(
                    {
                        "error": "Cannot create a user with 'General Volunteer' nor 'Tutor' roles via this flow."
                    },
                    status=400,
                )
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
                {"error": "Roles should be provided as a list of role names."},
                status=400,
            )
        print(
            f"DEBUG: Staff member created successfully with ID {staff_member.staff_id}"
        )
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


@csrf_exempt
@api_view(["GET"])
def get_general_volunteers_not_pending(request):
    """
    Get all general volunteers who are NOT in the Pending_Tutor table.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Only allow users with permission to view general volunteers
    if not has_permission(request, "general_volunteer", "VIEW"):
        return JsonResponse(
            {"error": "You do not have permission to access this resource."}, status=401
        )

    # Get all General Volunteers whose id_id is NOT in Pending_Tutor
    pending_ids = Pending_Tutor.objects.values_list("id_id", flat=True)
    volunteers = General_Volunteer.objects.exclude(
        id_id__in=pending_ids
    ).select_related("staff")
    data = [
        {
            "id": gv.id_id,
            "staff_id": gv.staff.staff_id,
            "first_name": gv.staff.first_name,
            "last_name": gv.staff.last_name,
            "email": gv.staff.email,
            "signupdate": gv.signupdate,
            "comments": gv.comments,
            "updated": gv.updated,
        }
        for gv in volunteers
    ]
    return JsonResponse({"general_volunteers": data}, status=200)
