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
from django.db.models import Count, F, Q
from .utils import *
from django.core.mail import send_mail
from django.conf import settings
from .audit_utils import log_api_action
from .logger import api_logger
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
    api_logger.info("get_permissions called")
    user_id = request.session.get("user_id")
    api_logger.debug(f"get_permissions run by user_id: {user_id}")
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


@conditional_csrf  # Disable CSRF (makes things easier)
@api_view(["POST"])
def logout_view(request):
    api_logger.info("logout_view called")
    user_id = request.session.get("user_id")
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
        api_logger.error(f"Logout failed: {str(e)}")
        api_logger.debug(f"Logout failed for user_id: {user_id}")
        return JsonResponse({"error": str(e)}, status=400)

@conditional_csrf
@api_view(["GET"])
def get_staff(request):
    api_logger.info("get_staff called")
    user_id = request.session.get("user_id")
    api_logger.debug(f"get_staff run by user_id: {user_id}")
    """
    Retrieve all staff along with their roles.
    """
    staff = Staff.objects.filter(is_active=True)
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
    api_logger.info(f"get_staff completed successfully for user_id: {user_id}")
    api_logger.debug(f"get_staff response: {staff_data}")
    return JsonResponse({"staff": staff_data})


@conditional_csrf
@api_view(["GET"])
def get_children(request):
    api_logger.info("get_children called")
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
    user_id = request.session.get("user_id")
    api_logger.info(f"get_children completed successfully for user_id: {user_id}")
    api_logger.debug(f"get_children response: {children_data}")
    return JsonResponse({"children": children_data})


@conditional_csrf
@api_view(["GET"])
def get_tutors(request):
    api_logger.info("get_tutors called")
    """
    Retrieve all tutors along with their tutorship status.
    """
    tutors = Tutors.objects.select_related("staff", "id").filter(staff__is_active=True)
    
    # Get all pending tutor IDs for eligibility check
    pending_tutor_ids = set(Pending_Tutor.objects.values_list('id_id', flat=True))
    
    tutors_data = [
        {
            "id": t.id_id,  # ה-ID של המדריך בטבלת Tutors
            "first_name": t.staff.first_name,  # נתונים מטבלת Staff
            "last_name": t.staff.last_name,
            "birth_date": t.id.birth_date.strftime('%d/%m/%Y') if t.id and t.id.birth_date else None,  # Birth date from SignedUp
            "age": t.id.age if t.id else None,  # Age from SignedUp model
            "phone": t.id.phone if t.id else "",  # Phone from SignedUp model
            "city": t.id.city if t.id else "",  # City from SignedUp model (via join)
            "tutorship_status": t.tutorship_status,
            "preferences": t.preferences,
            "tutor_email": t.tutor_email,
            "relationship_status": t.relationship_status,
            "tutee_wellness": t.tutee_wellness,
            "updated": t.updated,  # The new 'updated' field
            "in_tutorship": Tutorships.objects.filter(tutor_id=t.id_id, child__isnull=False).exists(),  # Add this flag
            "eligibility": "ממתין לראיון" if t.id_id in pending_tutor_ids else "עבר ראיון",  # Eligibility based on Pending_Tutor
        }
        for t in tutors
    ]
    # Get marital status options from Children model
    marital_status_options = [choice[0] for choice in MaritalStatus.choices]
    status_options = [choice[0] for choice in TutorshipStatus.choices]
    
    # Get cities list
    import json
    import os
    cities_options = []
    try:
        settlements_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'components', 'settlements.json')
        if os.path.exists(settlements_path):
            with open(settlements_path, 'r', encoding='utf-8') as f:
                cities_options = json.load(f)
    except Exception as e:
        api_logger.error(f"Error loading cities: {e}")
        # Fallback to getting unique cities from database
        cities_options = list(Tutors.objects.values_list('city', flat=True).distinct())
    
    user_id = request.session.get("user_id")
    api_logger.info(f"get_tutors completed successfully for user_id: {user_id}")
    api_logger.debug(f"get_tutors response: {tutors_data}")
    return JsonResponse({
        "tutors": tutors_data,
        "tutorship_status_options": status_options,
        "marital_status_options": marital_status_options,
        "cities_options": cities_options,
    })

@conditional_csrf
@api_view(["GET"])
def get_pending_tutors(request):
    api_logger.info("get_pending_tutors called")
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
        api_logger.info(f"get_pending_tutors completed successfully for user_id: {request.session.get('user_id')}")
        api_logger.debug(f"get_pending_tutors response: {pending_tutors_data}")
        return JsonResponse({"pending_tutors": pending_tutors_data}, status=200)
    except Exception as e:
        api_logger.error(f"Error fetching pending tutors: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
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
                "birth_date": user.birth_date.strftime('%d/%m/%Y') if user.birth_date else None,
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
        api_logger.error(f"Error fetching signed-up users: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
@api_view(["GET"])
def get_all_staff(request):
    api_logger.info("get_all_staff called")
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
                "is_active": user.is_active,
                "deactivation_reason": user.deactivation_reason or "",
            }
        )

    api_logger.info(f"get_all_staff completed successfully for user_id: {user_id}")
    api_logger.debug(f"get_all_staff response: {staff_data}")
    return JsonResponse(
        {
            "staff": staff_data,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
        },
        status=200,
    )
@conditional_csrf
@api_view(["GET"])
def get_roles(request):
    api_logger.info("get_roles called")
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
        api_logger.warning(f"User {user_id} attempted to access roles without permission.")
        return JsonResponse(
            {"error": "You do not have permission to view this page."}, status=401
        )

    try:
        roles = Role.objects.all()
        roles_data = [{"id": role.id, "role_name": role.role_name} for role in roles]
        api_logger.debug(f"get_roles response: {roles_data}")
        return JsonResponse({"roles": roles_data}, status=200)
    except Exception as e:
        api_logger.error(f"Error fetching roles: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def create_staff_member(request):
    api_logger.info("create_staff_member called")
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
        api_logger.critical(f"User {user_id} attempted to create a staff member without permission.")
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
        api_logger.debug(f"Data received for new staff member: {data}")
        if missing_fields:
            return JsonResponse(
                {
                    "error": f"Missing or empty required fields: {', '.join(missing_fields)}"
                },
                status=400,
            )

        # Check if username already exists
        if Staff.objects.filter(username=data["username"]).exists():
            api_logger.warning(f"User {user_id} attempted to create a staff member with an existing username: {data['username']}")
            return JsonResponse(
                {"error": f"Username '{data['username']}' already exists."}, status=400
            )

        # Check if email already exists
        if Staff.objects.filter(email=data["email"]).exists():
            api_logger.warning(f"User {user_id} attempted to create a staff member with an existing email: {data['email']}")
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
        api_logger.debug(f"Roles provided: {roles}")
        if isinstance(roles, list):
            if "General Volunteer" in roles or "Tutor" in roles:
                api_logger.warning(f"User {user_id} attempted to create a staff member with disallowed roles: {roles}")
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
                    api_logger.warning(f"User {user_id} attempted to create a staff member with a non-existent role: {role_name}")
                    return JsonResponse(
                        {"error": f"Role with name '{role_name}' does not exist."},
                        status=400,
                    )
        else:
            api_logger.warning(f"User {user_id} attempted to create a staff member with invalid roles: {roles}")
            return JsonResponse(
                {"error": "Roles should be provided as a list of role names."},
                status=400,
            )
        api_logger.debug(
            f"Staff member created successfully with ID {staff_member.staff_id}"
        )
        return JsonResponse(
            {
                "message": "Staff member created successfully",
                "staff_id": staff_member.staff_id,
            },
            status=201,
        )
    except Exception as e:
        api_logger.error(f"An error occurred while creating a staff member: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["GET"])
def get_general_volunteers_not_pending(request):
    api_logger.info("get_general_volunteers_not_pending called")
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
        api_logger.warning(f"User {user_id} attempted to access general volunteers without permission.")
        return JsonResponse(
            {"error": "You do not have permission to access this resource."}, status=401
        )

    # Get all General Volunteers whose id_id is NOT in Pending_Tutor
    pending_ids = Pending_Tutor.objects.values_list("id_id", flat=True)
    volunteers = General_Volunteer.objects.exclude(
        id_id__in=pending_ids
    ).select_related("staff", "id")
    data = [
        {
            "id": gv.id_id,
            "staff_id": gv.staff.staff_id,
            "first_name": gv.staff.first_name,
            "last_name": gv.staff.last_name,
            "email": gv.staff.email,
            "birth_date": gv.id.birth_date.strftime('%d/%m/%Y') if gv.id and gv.id.birth_date else None,  # Birth date from SignedUp
            "age": gv.id.age if gv.id else None,  # Age from SignedUp model
            "phone": gv.id.phone if gv.id else "",  # Phone from SignedUp model
            "city": gv.id.city if gv.id else "",  # City from SignedUp model
            "signupdate": gv.signupdate,
            "comments": gv.comments,
            "updated": gv.updated,
        }
        for gv in volunteers
    ]
    api_logger.info(f"get_general_volunteers_not_pending completed successfully for user_id: {user_id}")
    api_logger.debug(f"get_general_volunteers_not_pending response: {data}")
    return JsonResponse({"general_volunteers": data}, status=200)

@conditional_csrf
@api_view(["POST"])
def google_login_success(request):
    api_logger.info("google_login_success called in views.py")
    """
    Setup session for Google OAuth user - like regular login
    """
    # Debug information
    api_logger.debug(f"request.user: {request.user}")
    api_logger.debug(f"request.user.is_authenticated: {request.user.is_authenticated}")
    api_logger.debug(f"request.session.keys(): {list(request.session.keys())}")
    api_logger.debug(f"_auth_user_id: {request.session.get('_auth_user_id')}")
    
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
            api_logger.debug(f"Found Django user from session: {django_user}")
            api_logger.debug(f"Django user email: '{django_user.email}'")
            api_logger.debug(f"Django user username: '{django_user.username}'")
        except User.DoesNotExist:
            api_logger.debug(f"Django user with ID {user_id_from_session} not found")
    
    if not django_user:
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message="Not authenticated - no Django user found",
            status_code=401,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': 'unknown',
                'failure_reason': 'no_django_user'
            }
        )
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    api_logger.debug(f"About to search for Staff with email: '{django_user.email}'")
    
    try:
        # Find the Staff record by email
        staff_user = Staff.objects.get(email=django_user.email)
        
        # Create session
        request.session.flush()
        request.session.create()
        request.session["user_id"] = staff_user.staff_id
        request.session["username"] = staff_user.username
        request.session.set_expiry(86400)

        api_logger.info(f"User {staff_user.staff_id} logged in successfully via Google OAuth")
        # **ENHANCED GOOGLE LOGIN SUCCESS**
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_SUCCESS',
            entity_type='Staff',
            entity_ids=[staff_user.staff_id],
            success=True,
            additional_data={
                'login_method': 'Google OAuth',
                'user_full_name': f"{staff_user.first_name} {staff_user.last_name}",
                'user_roles': [role.role_name for role in staff_user.roles.all()],
                'google_email': django_user.email
            }
        )
        api_logger.info(f"User {staff_user.staff_id} logged in successfully via Google OAuth")
        return JsonResponse({
            "message": "Google login successful!",
            "user_id": staff_user.staff_id,
            "username": staff_user.username,
            "email": staff_user.email
        })
        
    except Staff.DoesNotExist:
        # **ENHANCED GOOGLE LOGIN FAILED - WITH ATTEMPTED EMAIL**
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=f"Access denied. Email {django_user.email} is not authorized to access this system",
            status_code=404,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': django_user.email,  # Pass the actual email
                'failure_reason': 'email_not_found_in_system',
                'google_username': django_user.username if hasattr(django_user, 'username') else 'unknown'
            }
        )
        user_id = request.session.get("user_id", "unknown")
        api_logger.critical(f"User {user_id} attempted to log in with an unauthorized email: {django_user.email}")
        return JsonResponse({"error": f"Access denied. Email {django_user.email} is not authorized to access this system"}, status=404)
        
    except Exception as e:
        # **ENHANCED GOOGLE LOGIN FAILED - WITH ATTEMPTED EMAIL IF AVAILABLE**
        attempted_email = django_user.email if django_user else 'unknown'
        log_api_action(
            request=request,
            action='GOOGLE_LOGIN_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            additional_data={
                'login_method': 'Google OAuth',
                'attempted_email': attempted_email,
                'failure_reason': 'system_error'
            }
        )
        api_logger.error(f"Error during Google login for email {attempted_email}: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
@api_view(["POST"])
def test_email_setup(request):
    api_logger.info("test_email_setup called")
    """Test the current email configuration"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Get email from request body instead of hardcoded
        data = json.loads(request.body) if request.body else {}
        test_email = data.get('email', 'childsmile533@gmail.com')  # Default to your email
        
        api_logger.debug(f"Testing email setup with: {test_email}")
        api_logger.debug(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        api_logger.debug(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
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
        api_logger.error(f"Error: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@conditional_csrf
@api_view(["POST"])
def test_gmail_auth(request):
    api_logger.info("test_gmail_auth called")
    """Test Gmail SMTP authentication only"""
    try:
        import smtplib
        from django.conf import settings
        
        api_logger.debug(f"Testing Gmail SMTP authentication...")
        api_logger.debug(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        api_logger.debug(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        api_logger.debug(f"EMAIL_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD)}")
        
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

@conditional_csrf
@api_view(["GET"])
def get_available_coordinators(request):
    api_logger.info("get_available_coordinators called")
    """
    Retrieve all staff members with coordinator roles (Families Coordinator or Tutored Families Coordinator).
    Returns coordinators grouped by role for proper assignment based on tutoring status.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=403)

    try:
        # Get Families Coordinators (for non-tutored families)
        families_coordinators = Staff.objects.filter(
            roles__role_name='Families Coordinator',
            is_active=True
        ).distinct().values('staff_id', 'first_name', 'last_name', 'email')

        # Get Tutored Families Coordinators (for tutored families)
        tutored_coordinators = Staff.objects.filter(
            roles__role_name='Tutored Families Coordinator',
            is_active=True
        ).distinct().values('staff_id', 'first_name', 'last_name', 'email')

        # Format coordinator data with role information
        families_coord_data = []
        for coordinator in families_coordinators:
            families_coord_data.append({
                'staff_id': coordinator['staff_id'],
                'name': f"{coordinator['first_name']} {coordinator['last_name']}",
                'email': coordinator['email'],
                'role': 'families'
            })

        tutored_coord_data = []
        for coordinator in tutored_coordinators:
            tutored_coord_data.append({
                'staff_id': coordinator['staff_id'],
                'name': f"{coordinator['first_name']} {coordinator['last_name']}",
                'email': coordinator['email'],
                'role': 'tutored'
            })

        api_logger.info(f"get_available_coordinators completed successfully for user_id: {user_id}")
        return JsonResponse(
            {
                "families_coordinators": families_coord_data,
                "tutored_coordinators": tutored_coord_data,
                "families_count": len(families_coord_data),
                "tutored_count": len(tutored_coord_data)
            },
            status=200,
        )
    except Exception as e:
        api_logger.error(f"Error fetching available coordinators: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
