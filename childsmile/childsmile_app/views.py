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
    MaritalStatus,
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
from django.core.mail import send_mail
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from .models import TOTPCode, Staff
import random
import string
from django.utils import timezone
from datetime import timedelta
from .audit_utils import log_api_action

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
        # Log successful logout
        log_api_action(
            request=request,
            action='USER_LOGOUT',
            success=True
        )
        
        request.session.flush()
        return JsonResponse({"message": "Logout successful!"})
    except Exception as e:
        # Log failed logout
        log_api_action(
            request=request,
            action='USER_LOGOUT',
            success=False,
            error_message=str(e),
            status_code=400
        )
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
            "in_tutorship": Tutorships.objects.filter(tutor_id=t.id_id, child__isnull=False).exists(),  # Add this flag
        }
        for t in tutors
    ]
    # Get marital status options from Children model
    marital_status_options = [choice[0] for choice in MaritalStatus.choices]
    status_options = [choice[0] for choice in TutorshipStatus.choices]
    return JsonResponse({
        "tutors": tutors_data,
        "tutorship_status_options": status_options,
        "marital_status_options": marital_status_options,
    })

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
        log_api_action(
            request=request,
            action='VIEW_STAFF_LIST_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='VIEW_STAFF_LIST_FAILED',
            success=False,
            error_message="You do not have permission to view this page",
            status_code=401
        )
        return JsonResponse({"error": "You do not have permission to view this page."}, status=401)

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
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to update this staff member",
            status_code=401
        )
        return JsonResponse({"error": "You do not have permission to update this staff member."}, status=401)

    try:
        # Fetch the existing staff record
        try:
            staff_member = Staff.objects.get(staff_id=staff_id)
        except Staff.DoesNotExist:
            log_api_action(
                request=request,
                action='UPDATE_STAFF_FAILED',
                success=False,
                error_message="Staff member not found",
                status_code=404,
                entity_type='Staff',
                entity_ids=[staff_id]
            )
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
        staff_member.email = data.get("email", staff_member.email)

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

        # Log successful update
        log_api_action(
            request=request,
            action='UPDATE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
            entity_type='Staff',
            entity_ids=[staff_member.staff_id],
            success=True,
            additional_data={
                'updated_staff_email': staff_member.email,
                'updated_roles': data.get('roles', [])
            }
        )

        return JsonResponse(
            {
                "message": "Staff member updated successfully",
                "staff_id": staff_member.staff_id,
            },
            status=200,
        )
    except Exception as e:
        log_api_action(
            request=request,
            action='UPDATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id]
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["DELETE"])
def delete_staff_member(request, staff_id):
    """
    Delete a staff member and all related data from the database.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    user = Staff.objects.get(staff_id=user_id)
    if not is_admin(user):
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="You do not have permission to delete this staff member",
            status_code=401
        )
        return JsonResponse({"error": "You do not have permission to delete this staff member."}, status=401)

    # check if the user tries to delete himself
    if staff_id == user_id:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message="You cannot delete yourself",
            status_code=406
        )
        return JsonResponse({"error": "You cannot delete yourself."}, status=406)
    try:
        # Fetch the existing staff record
        try:
            staff_member = Staff.objects.get(staff_id=staff_id)
        except Staff.DoesNotExist:
            log_api_action(
                request=request,
                action='DELETE_STAFF_FAILED',
                success=False,
                error_message="Staff member not found",
                status_code=404
            )
            return JsonResponse({"error": "Staff member not found."}, status=404)

        # Store info before deletion
        deleted_email = staff_member.email
        
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

        # Log successful deletion
        log_api_action(
            request=request,
            action='DELETE_STAFF_SUCCESS',
            affected_tables=['childsmile_app_staff', 'childsmile_app_signedup', 'childsmile_app_general_volunteer', 'childsmile_app_pending_tutor', 'childsmile_app_tutors'],
            entity_type='Staff',
            entity_ids=[staff_id],
            success=True,
            additional_data={
                'deleted_staff_email': deleted_email
            }
        )

        return JsonResponse({
            "message": "Staff member and related data deleted successfully",
            "staff_id": staff_id,
        }, status=200)
        
    except Exception as e:
        log_api_action(
            request=request,
            action='DELETE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Staff',
            entity_ids=[staff_id]
        )
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

@csrf_exempt
@api_view(["POST"])
def google_login_success(request):
    """
    Setup session for Google OAuth user - like regular login
    """
    # Debug information
    print(f"DEBUG: request.user: {request.user}")
    print(f"DEBUG: request.user.is_authenticated: {request.user.is_authenticated}")
    print(f"DEBUG: request.session.keys(): {list(request.session.keys())}")
    print(f"DEBUG: _auth_user_id: {request.session.get('_auth_user_id')}")
    
    # Try to get Django User from session
    django_user = None
    user_id_from_session = request.session.get('_auth_user_id')
    
    if request.user.is_authenticated:
        django_user = request.user
    elif user_id_from_session:
        # Manually get the user from session
        from django.contrib.auth.models import User
        try:
            django_user = User.objects.get(id=user_id_from_session)
            print(f"DEBUG: Found Django user from session: {django_user}")
            print(f"DEBUG: Django user email: '{django_user.email}'")  # ADD THIS
            print(f"DEBUG: Django user username: '{django_user.username}'")  # ADD THIS
        except User.DoesNotExist:
            print(f"DEBUG: Django user with ID {user_id_from_session} not found")
    
    if not django_user:
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message="Not authenticated",
            status_code=401
        )
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    print(f"DEBUG: About to search for Staff with email: '{django_user.email}'")  # ADD THIS
    
    try:
        # Find the Staff record by email
        staff_user = Staff.objects.get(email=django_user.email)
        
        # Create session
        request.session.flush()
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)
        
        # Log successful Google login
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_SUCCESS',
            entity_type='Staff',
            entity_ids=[staff_user.staff_id],
            success=True,
            additional_data={
                'login_method': 'Google OAuth'
            }
        )
        
        return JsonResponse({
            "message": "Google login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=f"Staff member not found for email: {django_user.email}",
            status_code=404
        )
        return JsonResponse({"error": f"Staff member not found for email: '{django_user.email}'"}, status=404)
    except Exception as e:
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)  # 5 requests per minute per IP
def login_email(request):
    """
    Send TOTP code to email address
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({"error": "Email is required"}, status=400)
        
        # Validate email format (basic)
        if '@' not in email or '.' not in email.split('@')[1]:
            return JsonResponse({"error": "Invalid email format"}, status=400)
        
        # Check if email exists in Staff table
        if not Staff.objects.filter(email=email).exists():
            return JsonResponse({"error": "Email not found in system"}, status=404)
        
        # Invalidate any existing codes for this email
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        
        # Generate new TOTP code
        code = TOTPCode.generate_code()
        totp_record = TOTPCode.objects.create(email=email, code=code)
        
        # Send email
        subject = "Your Login Code - Amit's Smile"
        message = f"""
        Hello,
        
        Your login code is: {code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        Child's Smile Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        print(f"DEBUG: Sent TOTP code {code} to {email}")
        
        return JsonResponse({
            "message": "Login code sent to your email",
            "email": email
        })
        
    except Exception as e:
        print(f"ERROR in login_email: {str(e)}")
        return JsonResponse({"error": "Failed to send login code"}, status=500)

@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)  # 10 requests per minute per IP
def verify_totp(request):
    """
    Verify TOTP code and create session
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Email and code are required",
                status_code=400
            )
            return JsonResponse({"error": "Email and code are required"}, status=400)
        
        # Find TOTP record
        totp_record = TOTPCode.objects.filter(
            email=email,
            code=code,
            used=False
        ).order_by('-created_at').first()
        
        if not totp_record:
            log_api_action(
                request=request,
                action='TOTP_VERIFICATION_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
        
        if not totp_record.is_valid():
            log_api_action(
                request=request,
                action='TOTP_VERIFICATION_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='TOTP_VERIFICATION_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='TOTP_VERIFICATION_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        # Mark code as used
        totp_record.used = True
        totp_record.save()
        
        # Find Staff member BEFORE logging TOTP verification success
        try:
            staff_user = Staff.objects.get(email=email)
        except Staff.DoesNotExist:
            log_api_action(
                request=request,
                action='USER_LOGIN_FAILED',
                success=False,
                error_message="Staff member not found",
                status_code=404,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Staff member not found"}, status=404)
        
        # Log successful TOTP verification (after we have staff_user)
        log_api_action(
            request=request,
            action='TOTP_VERIFICATION_SUCCESS',
            success=True,
            additional_data={'verified_email': email}
        )
        
        # Create session
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)
        
        # Log successful login
        log_api_action(
            request=request,
            action='USER_LOGIN_SUCCESS',
            entity_type='Staff',
            entity_ids=[staff_user.staff_id],
            success=True,
            additional_data={
                'login_method': 'TOTP'
            }
        )
        
        return JsonResponse({
            "message": "Login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Exception as e:
        print(f"ERROR in verify_totp: {str(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='USER_LOGIN_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Verification failed"}, status=500)

@csrf_exempt
@api_view(["POST"])
def test_email_setup(request):
    """Test the current email configuration"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Get email from request body instead of hardcoded
        data = json.loads(request.body) if request.body else {}
        test_email = data.get('email', 'childsmile533@gmail.com')  # Default to your email
        
        print(f"DEBUG: Testing email setup with: {test_email}")
        print(f"DEBUG: EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        print(f"DEBUG: DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
        send_mail(
            'Test Email - TOTP System (Real Email Test)',
            f'Hello! This is a test email sent to {test_email}.\n\nIf you receive this, your email setup is working!\n\nTest TOTP Code: 123456',
            settings.DEFAULT_FROM_EMAIL,
            [test_email],  # Send to the email from request
            fail_silently=False,
        )
        
        return JsonResponse({
            "message": f"Test email sent successfully to {test_email}!",
            "backend": settings.EMAIL_BACKEND,
            "from_email": settings.DEFAULT_FROM_EMAIL
        })
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(["POST"])
def test_gmail_auth(request):
    """Test Gmail SMTP authentication only"""
    try:
        import smtplib
        from django.conf import settings
        
        print(f"DEBUG: Testing Gmail SMTP authentication...")
        print(f"DEBUG: EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"DEBUG: EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        print(f"DEBUG: EMAIL_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD)}")
        
        # Try to connect and authenticate
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
        server.quit()
        
        return JsonResponse({
            "success": True,
            "message": f"Gmail SMTP authentication successful for {settings.EMAIL_HOST_USER}"
        })
        
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e),
            "message": "Gmail SMTP authentication failed - need App Password"
        }, status=400)

# Add these new endpoints to views.py

@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def register_send_totp(request):
    """
    Step 1: Validate registration data and send TOTP code
    """
    try:
        data = request.data
        
        # Validate all required fields first
        required_fields = ['id', 'first_name', 'surname', 'age', 'phone_prefix', 'phone_suffix', 'city', 'email']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return JsonResponse({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }, status=400)
        
        email = data.get('email', '').strip().lower()
        
        # Validate email format
        if '@' not in email or '.' not in email.split('@')[1]:
            return JsonResponse({"error": "Invalid email format"}, status=400)
        
        # Check if email or ID already exists
        user_id = data.get('id')
        if SignedUp.objects.filter(id=user_id).exists():
            return JsonResponse({"error": "A user with this ID already exists"}, status=400)
        
        if SignedUp.objects.filter(email=email).exists():
            return JsonResponse({"error": "A user with this email already exists"}, status=400)
        
        if Staff.objects.filter(email=email).exists():
            return JsonResponse({"error": "A user with this email already exists"}, status=400)

        # Store registration data in session temporarily
        request.session['pending_registration'] = data
        request.session['registration_email'] = email
        
        # Generate and send TOTP
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=email, code=code)
        
        # Send email
        subject = "Registration Verification - Child's Smile"
        message = f"""
        Hello {data.get('first_name', '')},
        
        Your registration verification code is: {code}
        
        This code will expire in 5 minutes.
        
        Please enter this code to complete your registration.
        
        Best regards,
        Child's Smile Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        print(f"DEBUG: Sent registration TOTP code {code} to {email}")
        
        return JsonResponse({
            "message": "Verification code sent to your email",
            "email": email
        })
        
    except Exception as e:
        print(f"ERROR in register_send_totp: {str(e)}")
        return JsonResponse({"error": "Failed to send verification code"}, status=500)

@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def register_verify_totp(request):
    """
    Step 2: Verify TOTP and create user
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Email and code are required",
                status_code=400
            )
            return JsonResponse({"error": "Email and code are required"}, status=400)
        
        # Check if this matches the pending registration
        pending_email = request.session.get('registration_email')
        print(f"DEBUG: Session pending_email: '{pending_email}'")
        print(f"DEBUG: Session keys: {list(request.session.keys())}")
        
        if pending_email != email:
            print(f"DEBUG: Email mismatch - session: '{pending_email}', received: '{email}'")
            return JsonResponse({"error": "Invalid registration session"}, status=400)
        
        # Verify TOTP code
        totp_record = TOTPCode.objects.filter(
            email=email,
            code=code,
            used=False
        ).order_by('-created_at').first()
        
        if not totp_record or not totp_record.is_valid():
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='USER_REGISTRATION_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        # Mark code as used
        totp_record.used = True
        totp_record.save()
        
        # Get registration data from session
        registration_data = request.session.get('pending_registration')
        if not registration_data:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_FAILED',
                success=False,
                error_message="Registration session expired",
                status_code=400
            )
            return JsonResponse({"error": "Registration session expired"}, status=400)
        
        # Create user
        result = create_volunteer_or_tutor_internal(registration_data, request)
        
        # Clear session data
        if 'pending_registration' in request.session:
            del request.session['pending_registration']
        if 'registration_email' in request.session:
            del request.session['registration_email']
        
        return result
        
    except Exception as e:
        log_api_action(
            request=request,
            action='USER_REGISTRATION_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Registration failed"}, status=500)

@transaction.atomic
def create_volunteer_or_tutor_internal(data, request=None):
    """
    Internal function to create volunteer/tutor (extracted from original function)
    """
    try:
        user_id = data.get("id")
        first_name = data.get("first_name")
        surname = data.get("surname")
        age = int(data.get("age"))
        gender = data.get("gender") == "Female"
        phone_prefix = data.get("phone_prefix")
        phone_suffix = data.get("phone_suffix")
        phone = f"{phone_prefix}-{phone_suffix}" if phone_prefix and phone_suffix else None
        city = data.get("city")
        comment = data.get("comment", "")
        email = data.get("email")
        want_tutor = data.get("want_tutor") == "true"

        # Create username
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

        # Get role
        role_name = "General Volunteer"
        role = Role.objects.get(role_name=role_name)

        # Create Staff
        staff = Staff.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=surname,
            created_at=now(),
        )
        staff.roles.add(role)
        staff.refresh_from_db()

        # Create volunteer or pending tutor
        if want_tutor:
            pending_tutor = Pending_Tutor.objects.create(
                id_id=signedup.id,
                pending_status="ממתין",
            )
            
            # Log pending tutor creation
            if request:
                log_api_action(
                    request=request,
                    action='CREATE_PENDING_TUTOR_SUCCESS',
                    affected_tables=['childsmile_app_pending_tutor'],
                    entity_type='Pending_Tutor',
                    entity_ids=[pending_tutor.pending_tutor_id],
                    success=True,
                    additional_data={
                        'tutor_email': email,
                        'first_name': first_name,
                        'surname': surname
                    }
                )
            
            task_type = Task_Types.objects.filter(
                task_type="ראיון מועמד לחונכות"
            ).first()
            if task_type:
                create_tasks_for_tutor_coordinators_async(pending_tutor.pending_tutor_id, task_type.id)
        else:
            General_Volunteer.objects.create(
                id_id=signedup.id,
                staff_id=staff.staff_id,
                signupdate=now().date(),
                comments="",
            )
            
            # Log volunteer creation
            if request:
                log_api_action(
                    request=request,
                    action='CREATE_VOLUNTEER_SUCCESS',
                    affected_tables=['childsmile_app_general_volunteer'],
                    entity_type='General_Volunteer',
                    entity_ids=[signedup.id],
                    success=True,
                    additional_data={
                        'volunteer_email': email,
                        'first_name': first_name,
                        'surname': surname
                    }
                )

        # Log successful registration
        if request:
            log_api_action(
                request=request,
                action='USER_REGISTRATION_SUCCESS',
                affected_tables=['childsmile_app_signedup', 'childsmile_app_staff'],
                entity_type='SignedUp',
                entity_ids=[signedup.id],
                success=True,
                additional_data={
                    'registration_type': 'pending_tutor' if want_tutor else 'volunteer',
                    'email': email,
                    'username': username
                }
            )

        return JsonResponse({
            "message": "Registration completed successfully!",
            "username": username,
        }, status=201)

    except Exception as e:
        if request:
            log_api_action(
                request=request,
                action='CREATE_VOLUNTEER_FAILED' if not data.get("want_tutor") else 'CREATE_PENDING_TUTOR_FAILED',
                success=False,
                error_message=str(e),
                status_code=500,
                additional_data={
                    'attempted_email': data.get('email', 'unknown')
                }
            )
        return JsonResponse({"error": str(e)}, status=500)

# Update create_staff_member_internal function
def create_staff_member_internal(data, request=None):
    try:
        staff_member = Staff.objects.create(
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            created_at=datetime.datetime.now(),
        )

        # Assign roles
        roles = data["roles"]
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                if request:
                    log_api_action(
                        request=request,
                        action='CREATE_STAFF_FAILED',
                        success=False,
                        error_message="Cannot create user with 'General Volunteer' or 'Tutor' roles via this flow",
                        status_code=400
                    )
                return JsonResponse({
                    "error": "Cannot create user with 'General Volunteer' or 'Tutor' roles via this flow"
                }, status=400)
            
            staff_member.roles.clear()
            for role_name in roles:
                try:
                    role = Role.objects.get(role_name=role_name)
                    staff_member.roles.add(role)
                except Role.DoesNotExist:
                    if request:
                        log_api_action(
                            request=request,
                            action='CREATE_STAFF_FAILED',
                            success=False,
                            error_message=f"Role '{role_name}' does not exist",
                            status_code=400
                        )
                    return JsonResponse({
                        "error": f"Role '{role_name}' does not exist"
                    }, status=400)

        # Log successful staff creation
        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_SUCCESS',
                affected_tables=['childsmile_app_staff', 'childsmile_app_staff_roles'],
                entity_type='Staff',
                entity_ids=[staff_member.staff_id],
                success=True,
                additional_data={
                    'created_staff_email': data["email"],
                    'assigned_roles': roles
                }
            )

        return JsonResponse({
            "message": "Staff member created successfully",
            "staff_id": staff_member.staff_id,
        }, status=201)

    except Exception as e:
        if request:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=str(e),
                status_code=500
            )
        return JsonResponse({"error": str(e)}, status=500)

# Update staff_creation_verify_totp function
@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='10/m', method='POST', block=True)
def staff_creation_verify_totp(request):
    try:
        print(f"DEBUG: staff_creation_verify_totp called")
        print(f"DEBUG: Request body: {request.body}")
        
        user_id = request.session.get("user_id")
        if not user_id:
            print(f"DEBUG: No user_id in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        # Check if user is admin
        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            print(f"DEBUG: User {user_id} is not admin")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = json.loads(request.body)
        code = data.get('code', '').strip()
        
        # Get email from session instead of request body
        email = request.session.get('staff_creation_new_user_email', '').strip().lower()
        
        print(f"DEBUG: Email from session: '{email}', code from request: '{code}'")
        print(f"DEBUG: Session keys: {list(request.session.keys())}")
        
        if not email or not code:
            print(f"DEBUG: Missing email or code - email: '{email}', code: '{code}'")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid session or missing code",
                status_code=400
            )
            return JsonResponse({"error": "Invalid session or missing code"}, status=400)
        
        # Check for TOTP record
        totp_record = TOTPCode.objects.filter(
            email=email,
            used=False
        ).order_by('-created_at').first()
        
        print(f"DEBUG: Found TOTP record: {totp_record}")
        if totp_record:
            print(f"DEBUG: TOTP code in DB: '{totp_record.code}', received: '{code}'")
            print(f"DEBUG: TOTP is_valid: {totp_record.is_valid()}")
        
        if not totp_record:
            print(f"DEBUG: No TOTP record found for email: {email}")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid or expired code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid or expired code"}, status=400)
            
        if not totp_record.is_valid():
            print(f"DEBUG: TOTP record is not valid")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Code has expired or too many attempts",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Code has expired or too many attempts"}, status=400)
        
        totp_record.attempts += 1
        totp_record.save()
        
        if totp_record.code != code:
            print(f"DEBUG: Code mismatch - DB: '{totp_record.code}', received: '{code}'")
            if totp_record.attempts >= 3:
                totp_record.used = True
                totp_record.save()
                log_api_action(
                    request=request,
                    action='CREATE_STAFF_FAILED',
                    success=False,
                    error_message="Too many failed attempts",
                    status_code=429,
                    additional_data={'attempted_email': email}
                )
                return JsonResponse({"error": "Too many failed attempts"}, status=429)
            
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Invalid code",
                status_code=400,
                additional_data={'attempted_email': email}
            )
            return JsonResponse({"error": "Invalid code"}, status=400)
        
        # Mark code as used
        totp_record.used = True
        totp_record.save()
        print(f"DEBUG: TOTP verification successful")
        
        # Get staff creation data from session
        staff_data = request.session.get('pending_staff_creation')
        print(f"DEBUG: Staff data from session: {staff_data}")
        
        if not staff_data:
            print(f"DEBUG: No staff data in session")
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Staff creation session expired",
                status_code=400
            )
            return JsonResponse({"error": "Staff creation session expired"}, status=400)
        
        # Create staff member
        print(f"DEBUG: About to create staff member")
        result = create_staff_member_internal(staff_data, request)
        
        # Clear session data
        if 'pending_staff_creation' in request.session:
            del request.session['pending_staff_creation']
        if 'staff_creation_new_user_email' in request.session:
            del request.session['staff_creation_new_user_email']
        
        print(f"DEBUG: Staff creation completed successfully")
        return result
        
    except Exception as e:
        print(f"ERROR in staff_creation_verify_totp: {str(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Staff creation failed"}, status=500)

# Add this function to your views.py file

@csrf_exempt
@api_view(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def staff_creation_send_totp(request):
    """
    Send TOTP code for staff creation verification
    """
    try:
        user_id = request.session.get("user_id")
        if not user_id:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Authentication required",
                status_code=403
            )
            return JsonResponse({"detail": "Authentication required"}, status=403)

        # Check if user is admin
        user = Staff.objects.get(staff_id=user_id)
        if not is_admin(user):
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Admin permission required",
                status_code=401
            )
            return JsonResponse({"error": "Admin permission required"}, status=401)

        data = request.data
        
        # Validate required fields - handle roles separately since it's a list
        required_fields = ["username", "email", "first_name", "last_name"]
        missing_fields = [field for field in required_fields if not data.get(field, "").strip()]
        
        # Check roles separately
        if not data.get("roles") or not isinstance(data.get("roles"), list) or len(data.get("roles")) == 0:
            missing_fields.append("roles")
            
        if missing_fields:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Missing or empty required fields: {', '.join(missing_fields)}",
                status_code=400
            )
            return JsonResponse({
                "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
            }, status=400)

        email = data.get("email").strip().lower()
        
        # Check if username already exists
        if Staff.objects.filter(username=data["username"]).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Username '{data['username']}' already exists",
                status_code=400
            )
            return JsonResponse({
                "error": f"Username '{data['username']}' already exists."
            }, status=400)

        # Check if email already exists
        if Staff.objects.filter(email=email).exists():
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Email '{email}' already exists",
                status_code=400
            )
            return JsonResponse({
                "error": f"Email '{email}' already exists."
            }, status=400)

        # Validate roles
        roles = data.get("roles", [])
        if "General Volunteer" in roles or "Tutor" in roles:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message="Cannot create user with 'General Volunteer' or 'Tutor' roles via this flow",
                status_code=400
            )
            return JsonResponse({
                "error": "Cannot create user with 'General Volunteer' or 'Tutor' roles via this flow"
            }, status=400)

        # Store staff creation data in session
        request.session['pending_staff_creation'] = data
        request.session['staff_creation_new_user_email'] = email

        # Generate and send TOTP
        TOTPCode.objects.filter(email=email, used=False).update(used=True)
        code = TOTPCode.generate_code()
        TOTPCode.objects.create(email=email, code=code)

        # Send email to the new staff member
        subject = "Staff Account Creation Verification - Child's Smile"
        message = f"""
        Hello {data.get('first_name', '')},
        
        An admin is creating a staff account for you in the Child's Smile system.
        
        Your verification code is: {code}
        
        This code will expire in 5 minutes.
        
        Please provide this code to the admin to complete your account creation.
        
        Best regards,
        Child's Smile Team
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            # Log successful TOTP send for staff creation
            log_api_action(
                request=request,
                action='CREATE_STAFF_SUCCESS',  # This is the start of staff creation
                success=True,
                additional_data={
                    'step': 'totp_sent',
                    'target_email': email,
                    'target_username': data.get('username'),
                    'target_roles': roles
                }
            )
            
            print(f"DEBUG: Sent staff creation TOTP code {code} to {email}")
            
            return JsonResponse({
                "message": "Verification code sent to the new staff member's email",
                "email": email
            })
            
        except Exception as email_error:
            log_api_action(
                request=request,
                action='CREATE_STAFF_FAILED',
                success=False,
                error_message=f"Failed to send verification email: {str(email_error)}",
                status_code=500
            )
            return JsonResponse({"error": f"Failed to send verification email: {str(email_error)}"}, status=500)
        
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message="Authentication required - staff not found",
            status_code=403
        )
        return JsonResponse({"error": "Authentication required"}, status=403)
    except Exception as e:
        print(f"ERROR in staff_creation_send_totp: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_STAFF_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": "Failed to send verification code"}, status=500)