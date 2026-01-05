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
from django.utils import timezone
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
from django.core.mail import send_mail, send_mass_mail
from django.conf import settings
                            
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import warnings

# Suppress the naive datetime warning for auto_now fields
warnings.filterwarnings(
    'ignore',
    message='.*DateTimeField.*received a naive datetime.*',
    category=RuntimeWarning
)

@conditional_csrf
@api_view(["GET"])
def get_user_tasks(request):
    api_logger.info("get_user_tasks called")
    
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='VIEW_TASKS_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    try:
        # Fetch the user
        user = Staff.objects.get(staff_id=user_id)
        
        # SECURITY: Only admin users can trigger monthly task creation
        user_is_admin = is_admin(user)
        
        api_logger.debug(f"Logged-in user: {user.username}")
        api_logger.debug(f"Is user '{user.username}' an admin? {user_is_admin}")

        # Always fetch tasks from DB, no cache
        if user_is_admin:
            api_logger.debug("Fetching all tasks for admin user.")
            tasks = (
                Tasks.objects.all()
                .select_related("task_type", "assigned_to", "pending_tutor__id", "related_child")
                .order_by("-updated_at")
            )
        else:
            api_logger.debug(f"Fetching tasks assigned to user '{user.username}'.")
            tasks = (
                Tasks.objects.filter(assigned_to_id=user_id)
                .select_related("task_type", "assigned_to", "pending_tutor__id", "related_child")
                .order_by("-updated_at")
            )

        # Build tasks_data for the response
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
                "child_last_review_talk_conducted": (
                    task.related_child.last_review_talk_conducted.strftime("%d/%m/%Y")
                    if task.related_child and task.related_child.last_review_talk_conducted
                    else None
                ),
                "tutor": task.related_tutor_id,
                "type": task.task_type_id,
                "type_name": task.task_type.task_type if task.task_type else None,  # ADD: task type name for frontend
                "pending_tutor": (
                    {
                        "id": task.pending_tutor.id_id,
                        "first_name": task.pending_tutor.id.first_name,
                        "surname": task.pending_tutor.id.surname,
                    }
                    if task.pending_tutor
                    else None
                ),
                "names": task.names,
                "phones": task.phones,
                "other_information": task.other_information,
                "user_info": task.user_info,  # Include user_info for registration approval tasks
                "initial_family_data_id_fk": (
                    task.initial_family_data_id_fk.initial_family_data_id
                    if task.initial_family_data_id_fk
                    else None
                ),
            }
            for task in tasks
        ]
        api_logger.debug(f"Fetched tasks: {tasks_data}")
        # Always fetch all task types, EXCLUDING internal-only types (registration approval)
        task_types = Task_Types.objects.all() # exclude(task_type="אישור הרשמה") --- IGNORE ---
        task_types_data = [
            {
                "id": t.id,
                "name": t.task_type,
                "resource": t.resource,
                "action": t.action,
            }
            for t in task_types
        ]
        api_logger.debug(f"Fetched task types: {task_types_data}")
        return JsonResponse({"tasks": tasks_data, "task_types": task_types_data})

    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='VIEW_TASKS_FAILED',
            success=False,
            error_message="User not found",
            status_code=404
        )
        api_logger.warning("User not found")
        return JsonResponse({"error": "User not found."}, status=404)
    except Exception as e:
        api_logger.error(f"An error occurred while fetching tasks: {str(e)}")
        log_api_action(
            request=request,
            action='VIEW_TASKS_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def create_task(request):
    api_logger.info("create_task called")
    """
    Create a new task.
    """
    api_logger.debug(f"Create task data: {request.data}")
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='CREATE_TASK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has CREATE permission on the "tasks" resource
    if not has_permission(request, "tasks", "CREATE"):
        log_api_action(
            request=request,
            action='CREATE_TASK_FAILED',
            success=False,
            error_message="You do not have permission to create tasks",
            status_code=401
        )
        api_logger.warning("User lacks permission to create tasks")
        return JsonResponse(
            {"error": "You do not have permission to create tasks."}, status=401
        )

    task_data = request.data
    try:
        # --- NEW VALIDATION: Reject registration approval task type (internal only) ---
        task_type_id = task_data.get("type")
        if task_type_id:
            try:
                task_type_obj = Task_Types.objects.get(id=task_type_id)
                if task_type_obj.task_type == "אישור הרשמה":
                    log_api_action(
                        request=request,
                        action='CREATE_TASK_FAILED',
                        success=False,
                        error_message='Attempt to manually create registration approval task',
                        status_code=400,
                        additional_data={
                            'task_type': task_type_obj.task_type,
                            'reason': 'Registration approval tasks can only be created internally'
                        }
                    )
                    api_logger.warning(f"User attempted to manually create registration approval task")
                    return JsonResponse({
                        "error": "Registration approval tasks can only be created internally"
                    }, status=400)
            except Task_Types.DoesNotExist:
                pass  # Will be caught below
        
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
                log_api_action(
                    request=request,
                    action='CREATE_TASK_FAILED',
                    success=False,
                    error_message=f"Staff member with ID or username '{assigned_to}' not found",
                    status_code=400,
                    additional_data={
                        'task_type': task_data.get("type"),
                        'attempted_assigned_to': assigned_to
                    }
                )
                api_logger.warning(f"Staff member with ID or username '{assigned_to}' not found.")
                return JsonResponse(
                    {
                        "detail": f"Staff member with ID or username '{assigned_to}' not found."
                    },
                    status=400,
                )

        # --- NEW LOGIC: Add Pending_Tutor if needed ---
        try:
            task_type_obj = Task_Types.objects.get(id=task_data["type"])
            if task_type_obj.task_type == "ראיון מועמד לחונכות":
                pending_tutor_id = task_data.get("pending_tutor")
                if pending_tutor_id:
                    # If not already in Pending_Tutor, create it
                    if not Pending_Tutor.objects.filter(
                        id_id=pending_tutor_id
                    ).exists():
                        new_pending = Pending_Tutor.objects.create(
                            id_id=pending_tutor_id, pending_status="ממתין"
                        )
                        api_logger.debug(
                            f"Created new Pending_Tutor with ID {pending_tutor_id}"
                        )
                        # Update task_data to use the PK, not the volunteer ID
                        task_data["pending_tutor"] = new_pending.pending_tutor_id
                    else:
                        # If already exists, get the PK
                        existing = Pending_Tutor.objects.get(id_id=pending_tutor_id)
                        task_data["pending_tutor"] = existing.pending_tutor_id
        except Task_Types.DoesNotExist:
            log_api_action(
                request=request,
                action='CREATE_TASK_FAILED',
                success=False,
                error_message="Invalid task type ID",
                status_code=400,
                additional_data={
                    'attempted_task_type_id': task_data.get("type"),
                    'attempted_assigned_to': task_data.get("assigned_to")
                }
            )
            return JsonResponse({"detail": "Invalid task type ID."}, status=400)
        except Exception as e:
            api_logger.error(f"Error in Pending_Tutor creation logic: {str(e)}")

        api_logger.debug(f"Task data being sent to create_task_internal: {task_data}")
        task = create_task_internal(task_data)

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # Get assignee name if exists
        assignee_name = None
        assignee_email = None
        assigned_to_id = task_data.get("assigned_to")
        if assigned_to_id:
            try:
                assignee = Staff.objects.get(staff_id=assigned_to_id)
                assignee_name = f"{assignee.first_name} {assignee.last_name}"
                assignee_email = assignee.email
            except Staff.DoesNotExist:
                pass

        log_api_action(
            request=request,
            action='CREATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True,
            additional_data={
                'task_type': task_type_obj.task_type if 'task_type_obj' in locals() else 'Unknown',
                'assigned_to_id': assigned_to_id,
                'assigned_to_name': assignee_name,
                'assigned_to_email': assignee_email
            }
        )

        return JsonResponse({"task_id": task.task_id}, status=201)
    except Task_Types.DoesNotExist:
        return JsonResponse({"detail": "Invalid task type ID."}, status=400)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='CREATE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"detail": str(e)}, status=500)


@conditional_csrf
@api_view(["DELETE"])
def delete_task(request, task_id):
    api_logger.info(f"delete_task called for task_id: {task_id}")
    """
    Delete a task. For registration approval tasks, requires admin role and handles rejection workflow.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has DELETE permission on the "tasks" resource
    if not has_permission(request, "tasks", "DELETE"):
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message="You do not have permission to delete tasks",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to delete tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)
        task_type = task.task_type
        
        # Check if this is a registration approval task
        is_registration_approval = task_type and getattr(task_type, "task_type", None) == "אישור הרשמה"
        
        # For registration approval tasks, only System Administrator can delete
        if is_registration_approval:
            user = Staff.objects.get(staff_id=user_id)
            # Check if user has System Administrator role
            has_admin_role = is_admin(user)
            
            if not has_admin_role:
                log_api_action(
                    request=request,
                    action='DELETE_TASK_FAILED',
                    success=False,
                    error_message='Non-admin attempted to delete registration approval task',
                    status_code=401,
                    additional_data={
                        'task_id': task_id,
                        'task_type': 'אישור הרשמה',
                        'reason': 'Only System Administrator can delete registration approval tasks'
                    }
                )
                api_logger
                return JsonResponse({
                    "error": "Only System Administrator can delete registration approval tasks."
                }, status=401)
            
            # Get rejection reason from request
            rejection_reason = request.data.get("rejection_reason")
            if not rejection_reason or not rejection_reason.strip():
                return JsonResponse({
                    "error": "Rejection reason is required for deleting registration approval tasks."
                }, status=400)
            
            if len(rejection_reason) > 200:
                return JsonResponse({
                    "error": "Rejection reason must not exceed 200 characters."
                }, status=400)
            
            # Update task with rejection reason before deletion
            task.rejection_reason = rejection_reason.strip()
            task.save()
        
        assigned_to_id = task.assigned_to_id
        pending_tutor_id = task.pending_tutor_id
        
        # If task type is "ראיון מועמד לחונכות", delete the associated Pending_Tutor
        if task_type and getattr(task_type, "task_type", None) == "ראיון מועמד לחונכות":
            api_logger.debug(f"Deleting task {task_id} of type {task_type}")
            if pending_tutor_id:
                try:
                    pending_tutor = Pending_Tutor.objects.get(pending_tutor_id=pending_tutor_id)
                    if not has_permission(request, "pending_tutor", "DELETE"):
                        log_api_action(
                            request=request,
                            action='DELETE_TASK_FAILED',
                            success=False,
                            error_message="You do not have permission to delete pending tutors",
                            status_code=401,
                        )
                        return JsonResponse(
                            {"error": "You do not have permission to delete pending tutors."}, status=401
                        )
                    pending_tutor.delete()
                    api_logger.debug(f"Deleted Pending_Tutor with ID {pending_tutor_id}")
                except Pending_Tutor.DoesNotExist:
                    api_logger.debug(f"Pending_Tutor with ID {pending_tutor_id} does not exist")
        
        # If task type is "אישור הרשמה", handle rejection workflow
        rejected_email = None
        if is_registration_approval:
            # Extract email from user_info if available
            if task.user_info and isinstance(task.user_info, dict):
                rejected_email = task.user_info.get("email")
            
            # Fallback: try to extract from description
            if not rejected_email:
                description = task.description
                import re
                email_match = re.search(r'\(([^)]+)\)', description)
                if email_match:
                    rejected_email = email_match.group(1)
            
            api_logger.debug(f"Handling registration rejection - extracted_email: {rejected_email}")
            
            if rejected_email:
                # FIRST: Delete all other registration approval tasks for this user
                # (do this BEFORE checking cascade delete, to clear out duplicate tasks)
                other_reg_tasks = Tasks.objects.filter(
                    task_type__task_type="אישור הרשמה"
                ).exclude(task_id=task_id)
                
                tasks_to_delete = []
                for t in other_reg_tasks:
                    if t.user_info and isinstance(t.user_info, dict):
                        if t.user_info.get("email") == rejected_email:
                            tasks_to_delete.append(t)
                
                deleted_count = len(tasks_to_delete)
                for t in tasks_to_delete:
                    t.delete()
                
                if deleted_count > 0:
                    api_logger.info(f"Deleted {deleted_count} other registration approval tasks for {rejected_email}")
                else:
                    api_logger.debug(f"No other registration approval tasks found for {rejected_email}")
                
                # NOW: Delete the user and related data
                try:
                    # Delete associated Staff user (the unapproved registration)
                    staff_user = Staff.objects.get(email=rejected_email, registration_approved=False)
                    staff_user_id = staff_user.staff_id
                    
                    api_logger.info(f"Found staff user to delete: {staff_user_id} ({rejected_email})")
                    
                    # Delete associated SignedUp records
                    signed_up_count = SignedUp.objects.filter(email=rejected_email).count()
                    SignedUp.objects.filter(email=rejected_email).delete()
                    api_logger.info(f"Deleted {signed_up_count} SignedUp records for {rejected_email}")
                    
                    # Delete the unapproved user
                    staff_user.delete()
                    api_logger.info(f"Deleted unapproved user {staff_user_id} ({rejected_email})")
                    
                    # Send rejection emails to all System Administrators
                    try:
                        admin_role = Role.objects.get(role_name="System Administrator")
                        admin_emails = Staff.objects.filter(
                            roles=admin_role
                        ).exclude(staff_id=user_id).values_list('email', flat=True)
                        
                        if admin_emails:
                            current_admin_user = Staff.objects.get(staff_id=user_id)
                            current_admin_name = f"{current_admin_user.first_name} {current_admin_user.last_name}"
                                                        
                            rejection_reason_text = task.rejection_reason or "No reason provided"
                            
                            subject = "הרשמה נדחתה"
                            message = f"""
                            שלום,

                            הרשמה של {rejected_email} נדחתה על ידי {current_admin_name}.

                            סיבת דחייה:
                            {rejection_reason_text}

                            המשתמש והנתונים הקשורים אליו הוסרו מהמערכת.
                            """
                            
                            messages = [
                                (subject, message, 'noreply@childsmile.com', [admin_email])
                                for admin_email in admin_emails
                            ]
                            send_mass_mail(messages, fail_silently=True)
                            api_logger.info(f"Sent rejection emails to {len(admin_emails)} admins")
                    except Exception as e:
                        api_logger.error(f"Error sending rejection emails: {str(e)}")
                
                except Staff.DoesNotExist:
                    api_logger.warning(f"Staff user not found for email {rejected_email} with registration_approved=False - trying without filter")
                    try:
                        # Fallback: try to find and delete without registration_approved filter
                        staff_user = Staff.objects.get(email=rejected_email)
                        staff_user_id = staff_user.staff_id
                        api_logger.warning(f"Found staff user via email only: {staff_user_id} ({rejected_email})")
                        
                        # Delete associated SignedUp records
                        SignedUp.objects.filter(email=rejected_email).delete()
                        api_logger.info(f"Deleted SignedUp records for {rejected_email}")
                        
                        # Delete the user
                        staff_user.delete()
                        api_logger.info(f"Deleted user {staff_user_id} ({rejected_email})")
                    except Staff.DoesNotExist:
                        api_logger.error(f"Staff user not found at all for email {rejected_email}")
            else:
                api_logger.warning(f"Could not extract email from registration approval task {task_id}")
        
        # Delete the main task
        task.delete()

        # Get task info for logging
        assignee_name = None
        assignee_email = None
        if assigned_to_id:
            try:
                assignee = Staff.objects.get(staff_id=assigned_to_id)
                assignee_name = f"{assignee.first_name} {assignee.last_name}"
                assignee_email = assignee.email
            except Staff.DoesNotExist:
                pass

        task_type_name = task_type.task_type if task_type else 'Unknown'

        log_api_action(
            request=request,
            action='DELETE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task_id],
            success=True,
            additional_data={
                'task_type': task_type_name,
                'assigned_to_id': assigned_to_id,
                'assigned_to_name': assignee_name,
                'assigned_to_email': assignee_email,
                'rejected_email': rejected_email if is_registration_approval else None,
                'rejection_reason': task.rejection_reason if is_registration_approval else None,
            }
        )

        return JsonResponse({"message": "Task deleted successfully."}, status=200)
    except Tasks.DoesNotExist:
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message="Task not found",
            status_code=404,
            entity_type='Task',
            entity_ids=[task_id],
            additional_data={
                'task_type': 'Unknown',
                'description': 'Unknown'
            }
        )
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500,
            entity_type='Task',
            entity_ids=[task_id],
            additional_data={
                'task_type': 'Unknown' if 'task_type' not in locals() else (task_type.task_type if task_type else 'Unknown'),
                'assigned_to_name': 'Unknown' if 'assignee_name' not in locals() else assignee_name
            }
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def update_task_status(request, task_id):
    api_logger.info(f"update_task_status called for task_id: {task_id}")
    """
    Update the status of a task.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tasks" resource
    if not has_permission(request, "tasks", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="You do not have permission to update tasks",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to update tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)
        
        # --- NEW VALIDATION: Only admins can change status of registration approval tasks ---
        if task.task_type and task.task_type.task_type == "אישור הרשמה":
            user = Staff.objects.get(staff_id=user_id)
            has_admin_role = user.roles.filter(role_name="System Administrator").exists()
            
            if not has_admin_role:
                log_api_action(
                    request=request,
                    action='UPDATE_TASK_FAILED',
                    success=False,
                    error_message='Non-admin attempted to move registration approval task',
                    status_code=401,
                    additional_data={
                        'task_id': task_id,
                        'task_type': 'אישור הרשמה',
                        'reason': 'Only System Administrator can modify registration approval tasks'
                    }
                )
                return JsonResponse({
                    "error": "Only System Administrator can modify registration approval tasks."
                }, status=401)
        
        old_status = task.status
        new_status = request.data.get("status", task.status)
        
        api_logger.debug(f"update_task_status: task_id={task_id}, old_status='{old_status}', new_status='{new_status}', task_type={task.task_type.task_type if task.task_type else None}")
        
        # Only proceed if status actually changed
        if old_status != new_status:
            # Create a snapshot of the task before updating status
            from .models import PrevTaskStatuses
            task_snapshot = {
                'task_id': task.task_id,
                'description': task.description,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'status': task.status,
                'assigned_to_id': task.assigned_to_id,
                'assigned_to_username': task.assigned_to.username if task.assigned_to else None,
                'task_type_id': task.task_type_id,
                'task_type_name': task.task_type.task_type if task.task_type else None,
                'related_child_id': task.related_child_id,
                'related_tutor_id': task.related_tutor_id,
                'pending_tutor_id': task.pending_tutor_id,
                'names': task.names,
                'phones': task.phones,
                'other_information': task.other_information,
                'user_info': task.user_info,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'updated_at': task.updated_at.isoformat() if task.updated_at else None,
            }
            
            # Save the previous status record with full task snapshot
            try:
                user = Staff.objects.get(staff_id=user_id)
                PrevTaskStatuses.objects.create(
                    task_id=task_id,
                    previous_status=old_status,
                    new_status=new_status,
                    task_snapshot=task_snapshot,
                    changed_by=user
                )
                api_logger.debug(f"Saved previous status for task {task_id}: {old_status} → {new_status}")
            except Exception as e:
                api_logger.error(f"Error saving previous task status: {str(e)}")
            
            # Now update the task status
            task.status = new_status
            task.save()

            api_logger.debug(f"Task {task_id} status updated to {new_status}")

        # ALWAYS CHECK: If this is a monthly family review task (שיחת ביקורת) being completed, update last_review_talk_conducted
        if new_status == "הושלמה" and task.task_type and task.task_type.task_type == "שיחת ביקורת" and task.related_child:
            try:
                api_logger.info(f"🔴 AUDIT CALL TASK COMPLETED: task_id={task_id}, child_id={task.related_child.child_id}")
                updated_date = timezone.now().date()
                api_logger.info(f"🔴 Setting last_review_talk_conducted to {updated_date} for child {task.related_child.child_id}")
                task.related_child.last_review_talk_conducted = updated_date
                task.related_child.save()
                api_logger.info(f"✅ Updated last_review_talk_conducted for child {task.related_child.child_id} to {updated_date}")
                
                # REGENERATE descriptions of pending audit-call tasks for this child
                # so they show the updated date instead of "Never" or the old date
                try:
                    child_full_name = f"{task.related_child.childfirstname} {task.related_child.childsurname}".strip()
                    date_str = updated_date.strftime('%d/%m/%Y') if updated_date else 'Never'
                    new_description = f'Monthly family review talk for {child_full_name} - Last talk: {date_str} - Conduct check-up call with family'
                    
                    # Update all pending (לא הושלמה) audit-call tasks for this child
                    pending_audit_tasks = Tasks.objects.filter(
                        related_child=task.related_child,
                        task_type__task_type="שיחת ביקורת",
                        status="לא הושלמה"
                    ).exclude(task_id=task_id)  # Don't update the current task (already completed)
                    
                    updated_count = pending_audit_tasks.update(description=new_description)
                    if updated_count > 0:
                        api_logger.info(f"✅ Updated descriptions of {updated_count} pending audit-call tasks for child {task.related_child.child_id} with new date {date_str}")
                except Exception as e:
                    api_logger.error(f"Error regenerating audit-call task descriptions for child {task.related_child.child_id}: {str(e)}")
            except Exception as e:
                api_logger.error(f"Error updating last_review_talk_conducted for child {task.related_child_id}: {str(e)}")

        # If status changed to "בביצוע" and task has initial_family_data_id_fk
        if new_status == "בביצוע" and task.initial_family_data_id_fk:
            # Delete all other tasks with the same initial_family_data_id_fk
            delete_other_tasks_with_initial_family_data_async(task)
        # If status changed to "בביצוע" and task is audit call task (שיחת ביקורת), delete other audit call tasks for same child
        elif new_status == "בביצוע" and task.task_type and task.task_type.task_type == "שיחת ביקורת":
            # Delete all other audit call tasks for this child (so only one coordinator calls the family)
            if task.related_child:
                try:
                    other_audit_tasks = Tasks.objects.filter(
                        related_child=task.related_child,
                        task_type__task_type="שיחת ביקורת"
                    ).exclude(task_id=task_id)
                    deleted_count = other_audit_tasks.count()
                    other_audit_tasks.delete()
                    if deleted_count > 0:
                        api_logger.info(f"Deleted {deleted_count} other audit call tasks for child {task.related_child.child_id} after coordinator {task.assigned_to.username} took task {task_id}")
                except Exception as e:
                    api_logger.error(f"Error deleting other audit call tasks: {str(e)}")
        # If status changed to "בביצוע" and task is registration approval, delete other admin tasks
        elif new_status == "בביצוע" and task.task_type and task.task_type.task_type == "אישור הרשמה":
            from .utils import delete_other_registration_approval_tasks_async
            delete_other_registration_approval_tasks_async(task)
            api_logger.info(f"Triggering async deletion of other registration approval tasks for task {task_id}")
        
        # Delete all previous status records for this task since it's now completed
        if new_status == "הושלמה":
            try:
                from .models import PrevTaskStatuses
                deleted_count, _ = PrevTaskStatuses.objects.filter(task_id=task_id).delete()
                api_logger.debug(f"Deleted {deleted_count} previous status records for completed task {task_id}")
            except Exception as e:
                api_logger.error(f"Error deleting previous status records for task {task_id}: {str(e)}")
            
            # HANDLE REGISTRATION APPROVAL
            if task.task_type and task.task_type.task_type == "אישור הרשמה":
                # Extract email from user_info if available
                user_email = None
                if task.user_info and isinstance(task.user_info, dict):
                    user_email = task.user_info.get("email")
                
                # Fallback: try to extract from description: "אישור הרשמה של Name (email@example.com)"
                if not user_email:
                    description = task.description
                    import re
                    email_match = re.search(r'\(([^)]+)\)', description)
                    if email_match:
                        user_email = email_match.group(1)
                
                api_logger.debug(f"Extracted email for registration approval: {user_email}")
                
                if user_email:
                    try:
                        staff_user = Staff.objects.get(email=user_email)
                        staff_user.registration_approved = True
                        staff_user.save()
                        api_logger.info(f"User {staff_user.staff_id} ({user_email}) approved for registration")
                        
                        # Send approval email
                        try:
                            subject = "!הרשמתך אושרה"
                            message = f"""
                            שלום {staff_user.first_name},

                            אנו שמחים להודיע לך שהרשמתך בחיוך של ילד אושרה!

                            כעת תוכל להתחבר למערכת ולהתחיל לעזור לילדים.

                            בברכה,
                            צוות חיוך של ילד
                            """
                            send_mail(
                                subject,
                                message,
                                settings.DEFAULT_FROM_EMAIL,
                                [user_email],
                                fail_silently=False,
                            )
                            api_logger.info(f"Approval email sent to {user_email}")
                        except Exception as email_error:
                            api_logger.error(f"Error sending approval email to {user_email}: {str(email_error)}")
                        
                        # NOW CHECK IF THIS USER WANTED TO BE A TUTOR - CREATE INTERVIEW TASK
                        # Find the SignedUp record to check if they wanted to be a tutor
                        try:
                            signed_up = SignedUp.objects.get(email=user_email)
                            api_logger.debug(f"Found SignedUp record for {user_email}, want_tutor={signed_up.want_tutor}")
                            if signed_up.want_tutor:
                                # Check if pending tutor exists
                                pending_tutor = Pending_Tutor.objects.filter(id_id=signed_up.id).first()
                                if pending_tutor:
                                    api_logger.debug(f"Found pending tutor for {user_email}, creating interview task")
                                    # Create interview task for tutor coordinators
                                    task_type_interview = Task_Types.objects.filter(
                                        task_type="ראיון מועמד לחונכות"
                                    ).first()
                                    if task_type_interview:
                                        create_tasks_for_tutor_coordinators_async(pending_tutor.pending_tutor_id, task_type_interview.id)
                                        api_logger.info(f"Created tutor interview task for approved user {staff_user.staff_id} ({user_email})")
                                    else:
                                        api_logger.warning(f"Interview task type not found")
                                else:
                                    api_logger.debug(f"No pending tutor found for {user_email}")
                            else:
                                api_logger.debug(f"User {user_email} does not want to be a tutor")
                        except SignedUp.DoesNotExist:
                            api_logger.debug(f"SignedUp record not found for {user_email}")
                        except Exception as e:
                            api_logger.error(f"Error creating tutor interview task for {user_email}: {str(e)}")
                    except Staff.DoesNotExist:
                        api_logger.error(f"Staff user not found for email {user_email} during registration approval")
                else:
                    api_logger.warning(f"Could not extract email from registration approval task {task_id}")
            
            # HANDLE TUTOR INTERVIEW
            elif task.task_type and task.task_type.task_type == "ראיון מועמד לחונכות":
                # pending_tutor is a FK to Pending_Tutor
                if task.pending_tutor:
                    pending_tutor_record = task.pending_tutor
                    api_logger.debug(
                        f"pending_tutor_id = {task.pending_tutor.pending_tutor_id}"
                    )
                    ok, msg = promote_pending_tutor_to_tutor(task)
                    api_logger.debug(f"Promotion called, result: {ok}, {msg}")
                    if not ok:
                        log_api_action(
                            request=request,
                            action='UPDATE_TASK_FAILED',
                            success=False,
                            error_message=f"Error promoting pending tutor: {msg}",
                            status_code=400
                        )
                        return JsonResponse(
                            {"Error promoting pending tutor": msg}, status=400
                        )
                    else:
                        # Promotion successful - delete the pending tutor record
                        pending_tutor_volunteer_name = f"{pending_tutor_record.id.first_name} {pending_tutor_record.id.surname}"
                        pending_tutor_id_val = pending_tutor_record.pending_tutor_id
                        pending_tutor_record.delete()
                        api_logger.debug(f"Deleted Pending_Tutor record with ID {pending_tutor_id_val}")
                        
                        # Log the deletion of pending tutor due to promotion
                        log_api_action(
                            request=request,
                            action='DELETE_PENDING_TUTOR_SUCCESS',
                            affected_tables=['childsmile_app_pending_tutor'],
                            entity_type='Pending_Tutor',
                            entity_ids=[pending_tutor_id_val],
                            success=True,
                            additional_data={
                                'reason': 'Promoted to Tutor',
                                'volunteer_name': pending_tutor_volunteer_name,
                                'promoted_from_task_id': task.task_id
                            }
                        )
                        
                        # Send congratulation email to the newly promoted tutor
                        try:
                            tutor_email = pending_tutor_record.id.email
                            tutor_name = pending_tutor_volunteer_name
                            
                            subject = "!ברוכים הבאים לצוות החונכים שלנו"
                            message = f"""
                            שלום {tutor_name},

                            אנו שמחים להודיע לך שעברת את הראיון לחונכות! 

                            כעת יש לך הרשאות חונך ותוכל להתחיל לעזור לילדים בקרוב.

                            תפקידך כחונך הוא ללוות ילד בדרכו החינוכית, להעניק לו תמיכה רגשית וחברתית, ולעזור בהשגת יעדיו.

                            אנו מודים לך על בחירתך להיות חלק מהמשימה החשובה הזו.

                            אם יש לך שאלות, אנא צור קשר עם צוות התמיכה שלנו.

                            בברכה,
                            צוות חיוך של ילד
                            """
                            
                            send_mail(
                                subject,
                                message,
                                settings.DEFAULT_FROM_EMAIL,
                                [tutor_email],
                                fail_silently=False,
                            )
                            api_logger.info(f"Congratulation email sent to {tutor_email}")
                        except Exception as email_error:
                            api_logger.error(f"Error sending promotion email to {tutor_email}: {str(email_error)}")

        log_api_action(
            request=request,
            action='UPDATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True,
            additional_data={
                'task_type': task.task_type.task_type if task.task_type else 'Unknown',
                'old_status': old_status,
                'new_status': new_status,
                'field_changes': [f"Status: '{new_status}' → '{old_status}'"],
                'changes_count': 1
            }
        )

        return JsonResponse(
            {"message": "Task status updated successfully."}, status=200
        )
    except Tasks.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="Task not found",
            status_code=404
        )
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["POST"])
def revert_task_status(request, task_id):
    """
    Revert task to its previous status and state.
    Restores all fields from the most recent PrevTaskStatuses snapshot.
    """
    api_logger.info(f"revert_task_status called for task_id: {task_id}")
    
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse({"error": "Authentication credentials were not provided"}, status=403)
    
    try:
        user = Staff.objects.get(user_id=user_id)
    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_FAILED',
            success=False,
            error_message="User not found",
            status_code=404
        )
        return JsonResponse({"error": "User not found"}, status=404)
    
    # Check UPDATE_TASK permission
    has_perm = Permissions.objects.filter(
        role_id=user.role_id,
        resource="tasks",
        action="UPDATE_TASK"
    ).exists()
    
    if not has_perm:
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_FAILED',
            success=False,
            error_message="User does not have permission to revert task status",
            status_code=403
        )
        return JsonResponse({"error": "User does not have permission to revert task status"}, status=403)
    
    try:
        # Get the task
        task = Tasks.objects.get(task_id=task_id)
        
        # Get the most recent status change record
        prev_status_record = PrevTaskStatuses.objects.filter(
            task_id=task_id
        ).order_by('-changed_at').first()
        
        if not prev_status_record:
            log_api_action(
                request=request,
                action='REVERT_TASK_STATUS_FAILED',
                success=False,
                error_message=f"No previous status found for task {task_id}",
                status_code=404
            )
            return JsonResponse({
                "error": "No previous status found for this task"
            }, status=404)
        
        # Get the snapshot
        snapshot = prev_status_record.task_snapshot
        current_status = task.status
        
        # Restore all fields from snapshot
        task.description = snapshot.get('description')
        task.due_date = snapshot.get('due_date')
        task.status = snapshot.get('status')  # Revert to previous status
        task.assigned_to_id = snapshot.get('assigned_to_id')
        task.task_type_id = snapshot.get('task_type_id')
        task.related_child_id = snapshot.get('related_child_id')
        task.related_tutor_id = snapshot.get('related_tutor_id')
        task.pending_tutor_id = snapshot.get('pending_tutor_id')
        task.names = snapshot.get('names')
        task.phones = snapshot.get('phones')
        task.other_information = snapshot.get('other_information')
        task.user_info = snapshot.get('user_info')
        
        # Save the task
        task.save()
        
        # Create a record of this revert action
        # Create snapshot of current state before revert
        revert_snapshot = {
            'task_id': task.task_id,
            'description': snapshot.get('description'),
            'due_date': snapshot.get('due_date'),
            'status': snapshot.get('status'),
            'assigned_to_id': snapshot.get('assigned_to_id'),
            'assigned_to_username': snapshot.get('assigned_to_username'),
            'task_type_id': snapshot.get('task_type_id'),
            'task_type_name': snapshot.get('task_type_name'),
            'related_child_id': snapshot.get('related_child_id'),
            'related_tutor_id': snapshot.get('related_tutor_id'),
            'pending_tutor_id': snapshot.get('pending_tutor_id'),
            'names': snapshot.get('names'),
            'phones': snapshot.get('phones'),
            'other_information': snapshot.get('other_information'),
            'user_info': snapshot.get('user_info'),
            'created_at': snapshot.get('created_at'),
            'updated_at': snapshot.get('updated_at'),
        }
        
        # Record the revert action
        PrevTaskStatuses.objects.create(
            task_id=task_id,
            previous_status=current_status,
            new_status=snapshot.get('status'),
            task_snapshot=revert_snapshot,
            changed_by=user
        )
        
        # Delete the reverted record
        prev_status_record.delete()
        
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_SUCCESS',
            success=True,
            object_id=str(task_id),
            object_type="Task",
            status_code=200
        )
        
        return JsonResponse({
            "message": "Task reverted successfully",
            "task_id": task_id,
            "previous_status": current_status,
            "reverted_to_status": task.status
        }, status=200)
        
    except Tasks.DoesNotExist:
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_FAILED',
            success=False,
            error_message=f"Task {task_id} not found",
            status_code=404
        )
        return JsonResponse({"error": f"Task {task_id} not found"}, status=404)
    except Exception as e:
        api_logger.error(f"Error reverting task {task_id}: {str(e)}")
        log_api_action(
            request=request,
            action='REVERT_TASK_STATUS_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@conditional_csrf
@api_view(["PUT"])
def update_task(request, task_id):
    api_logger.info(f"update_task called for task_id: {task_id}")
    """
    Update task details.
    """
    user_id = request.session.get("user_id")
    if not user_id:
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="Authentication credentials were not provided",
            status_code=403
        )
        return JsonResponse(
            {"detail": "Authentication credentials were not provided."}, status=403
        )

    # Check if the user has UPDATE permission on the "tasks" resource
    if not has_permission(request, "tasks", "UPDATE"):
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="You do not have permission to update tasks",
            status_code=401
        )
        return JsonResponse(
            {"error": "You do not have permission to update tasks."}, status=401
        )

    try:
        task = Tasks.objects.get(task_id=task_id)

        # --- NEW VALIDATION: Reject updates to registration approval task type (internal only) ---
        if task.task_type and task.task_type.task_type == "אישור הרשמה":
            log_api_action(
                request=request,
                action='UPDATE_TASK_FAILED',
                success=False,
                error_message='Attempt to manually update registration approval task',
                status_code=400,
                additional_data={
                    'task_id': task_id,
                    'task_type': task.task_type.task_type,
                    'reason': 'Registration approval tasks cannot be updated manually'
                }
            )
            api_logger.warning(f"User attempted to manually update registration approval task {task_id}")
            return JsonResponse({
                "error": "Registration approval tasks cannot be updated manually"
            }, status=400)

        # Store original values BEFORE any updates
        original_description = task.description
        original_status = task.status
        original_assigned_to = task.assigned_to_id
        original_task_type = task.task_type_id
        original_due_date = task.due_date

        # Update task fields
        task.description = request.data.get("description", task.description)
        task.due_date = request.data.get("due_date", task.due_date)
        new_status = request.data.get("status", task.status)
        if new_status:
            task.status = new_status

        # Handle assigned_to (convert staff_id directly)
        assigned_to = request.data.get("assigned_to")
        api_logger.debug(f"assigned_to = {assigned_to}")
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
                api_logger.error(
                    f"Staff member with username or ID '{assigned_to}' not found."
                )
                log_api_action(
                    request=request,
                    action='UPDATE_TASK_FAILED',
                    success=False,
                    error_message=f"Staff member with username or ID '{assigned_to}' not found",
                    status_code=400,
                    additional_data={
                        'task_type': task.task_type.task_type if task.task_type else 'Unknown',
                        'attempted_assigned_to': assigned_to
                    }
                )
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

        # Track field changes BEFORE saving
        field_changes = []
        if original_description != task.description:
            field_changes.append("Description changed")
        if original_status != task.status:
            field_changes.append(f"Status: '{task.status}' → '{original_status}'")
        if original_assigned_to != task.assigned_to_id:
            old_name = "Unknown"
            new_name = "Unknown"
            try:
                if original_assigned_to:
                    old_staff = Staff.objects.get(staff_id=original_assigned_to)
                    old_name = f"{old_staff.first_name} {old_staff.last_name}"
                if task.assigned_to_id:
                    new_staff = Staff.objects.get(staff_id=task.assigned_to_id)
                    new_name = f"{new_staff.first_name} {new_staff.last_name}"
            except Staff.DoesNotExist:
                pass
            field_changes.append(f"Assigned to: '{old_name}' → '{new_name}'")
        if original_task_type != task.task_type_id:
            field_changes.append("Task type changed")
        
        # Track due_date changes
        new_due_date = request.data.get("due_date", original_due_date)
        if new_due_date and original_due_date != new_due_date:
            field_changes.append(f"Due date: '{original_due_date}' → '{new_due_date}'")

        # Save the updated task
        task.save()

        # Ensure last_review_talk_conducted is updated when a monthly review task (שיחת ביקורת) is completed.
        # Some frontend flows call the generic update_task endpoint instead of update_task_status,
        # so update here as well to avoid missing the date update.
        if new_status == "הושלמה" and task.task_type and task.task_type.task_type == "שיחת ביקורת" and task.related_child:
            try:
                api_logger.info(f"🔴 AUDIT CALL TASK COMPLETED (via update_task): task_id={task_id}, child_id={task.related_child.child_id}")
                updated_date = timezone.now().date()
                api_logger.info(f"🔴 Setting last_review_talk_conducted to {updated_date} for child {task.related_child.child_id}")
                task.related_child.last_review_talk_conducted = updated_date
                task.related_child.save()
                api_logger.info(f"✅ Updated last_review_talk_conducted for child {task.related_child.child_id} to {updated_date}")
                
                # REGENERATE descriptions of pending audit-call tasks for this child
                try:
                    child_full_name = f"{task.related_child.childfirstname} {task.related_child.childsurname}".strip()
                    date_str = updated_date.strftime('%d/%m/%Y') if updated_date else 'Never'
                    new_description = f'Monthly family review talk for {child_full_name} - Last talk: {date_str} - Conduct check-up call with family'
                    
                    # Update all pending (לא הושלמה) audit-call tasks for this child
                    pending_audit_tasks = Tasks.objects.filter(
                        related_child=task.related_child,
                        task_type__task_type="שיחת ביקורת",
                        status="לא הושלמה"
                    ).exclude(task_id=task_id)
                    
                    updated_count = pending_audit_tasks.update(description=new_description)
                    if updated_count > 0:
                        api_logger.info(f"✅ Updated descriptions of {updated_count} pending audit-call tasks for child {task.related_child.child_id} with new date {date_str}")
                except Exception as e:
                    api_logger.error(f"Error regenerating audit-call task descriptions for child {task.related_child.child_id}: {str(e)}")
            except Exception as e:
                api_logger.error(f"Error updating last_review_talk_conducted in update_task for child {task.related_child_id}: {str(e)}")
        
        if new_status == "הושלמה":
            task_type = getattr(task, "task_type", None)
            if task_type and getattr(task_type, "name", "") == "ראיון מועמד לחונכות":
                pending_tutor_id = getattr(task, "pending_tutor_id", None)
                if pending_tutor_id:
                    ok, msg = promote_pending_tutor_to_tutor(task)
                    if not ok:
                        log_api_action(
                            request=request,
                            action='UPDATE_TASK_FAILED',
                            success=False,
                            error_message=f"Error promoting pending tutor: {msg}",
                            status_code=400,
                            additional_data={
                                'task_type': task.task_type.task_type if task.task_type else 'Unknown',
                                'new_status': new_status,
                                'field_changes': field_changes
                            }
                        )
                        return JsonResponse(
                            {"Error promoting pending tutor": msg}, status=400
                        )
                    else:
                        # Promotion successful - delete the pending tutor record
                        pending_tutor_record = task.pending_tutor
                        if pending_tutor_record:
                            pending_tutor_volunteer_name = f"{pending_tutor_record.id.first_name} {pending_tutor_record.id.surname}"
                            pending_tutor_id_val = pending_tutor_record.pending_tutor_id
                            pending_tutor_record.delete()
                            api_logger.debug(f"Deleted Pending_Tutor record with ID {pending_tutor_id_val}")
                            
                            # Log the deletion of pending tutor due to promotion
                            log_api_action(
                                request=request,
                                action='DELETE_PENDING_TUTOR_SUCCESS',
                                affected_tables=['childsmile_app_pending_tutor'],
                                entity_type='Pending_Tutor',
                                entity_ids=[pending_tutor_id_val],
                                success=True,
                                additional_data={
                                    'reason': 'Promoted to Tutor',
                                    'volunteer_name': pending_tutor_volunteer_name,
                                    'promoted_from_task_id': task.task_id
                                }
                            )
                            
                            # Send congratulation email to the newly promoted tutor
                            try:
                                tutor_email = pending_tutor_record.id.email
                                tutor_name = pending_tutor_volunteer_name
                                
                                subject = "!ברוכים הבאים לצוות החונכים שלנו"
                                message = f"""
                                שלום {tutor_name},

                                אנו שמחים להודיע לך שעברת את הראיון לחונכות! 

                                כעת יש לך הרשאות חונך ותוכל להתחיל לעזור לילדים בקרוב.

                                תפקידך כחונך הוא ללוות ילד בדרכו החינוכית, להעניק לו תמיכה רגשית וחברתית, ולעזור בהשגת יעדיו.

                                אנו מודים לך על בחירתך להיות חלק מהמשימה החשובה הזו.

                                אם יש לך שאלות, אנא צור קשר עם צוות התמיכה שלנו.

                                בברכה,
                                צוות חיוך של ילד
                                """
                                
                                send_mail(
                                    subject,
                                    message,
                                    settings.DEFAULT_FROM_EMAIL,
                                    [tutor_email],
                                    fail_silently=False,
                                )
                                api_logger.info(f"Congratulation email sent to {tutor_email}")
                            except Exception as email_error:
                                api_logger.error(f"Error sending promotion email to {tutor_email}: {str(email_error)}")

        # Get assignee name if exists
        assignee_name = None
        assignee_email = None
        if task.assigned_to_id:
            try:
                assignee = Staff.objects.get(staff_id=task.assigned_to_id)
                assignee_name = f"{assignee.first_name} {assignee.last_name}"
                assignee_email = assignee.email
            except Staff.DoesNotExist:
                pass

        log_api_action(
            request=request,
            action='UPDATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True,
            additional_data={
                'task_type': task.task_type.task_type if task.task_type else 'Unknown',
                'old_status': original_status,
                'new_status': task.status,
                'assigned_to_id': task.assigned_to_id,
                'assigned_to_name': assignee_name,
                'assigned_to_email': assignee_email,
                'field_changes': field_changes,
                'changes_count': len(field_changes)
            }
        )

        return JsonResponse({"message": "Task updated successfully."}, status=200)
    except Tasks.DoesNotExist:
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message="Task not found",
            status_code=404
        )
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        api_logger.error(f"An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["POST"])
def check_monthly_review_tasks(request):
    """
    Check and create monthly family review tasks.
    
    This endpoint can be called by Azure Scheduler, Logic App, or any external service.
    It checks all families and creates review tasks for those needing follow-up.
    
    Authentication: Optional (can use API key or webhook secret in header)
    
    Returns:
        - families_checked: Total active families
        - tasks_created: New tasks created
        - tasks_skipped: Families skipped (recent review or existing task)
        - status: 'completed', 'disabled', or 'error'
    """
    api_logger.info("check_monthly_review_tasks endpoint called")
    
    try:
        from .monthly_tasks import check_and_create_monthly_review_tasks
        
        # Call the main logic
        result = check_and_create_monthly_review_tasks()
        
        api_logger.info(f"Monthly review check result: {result}")
        
        return JsonResponse({
            "status": result.get('status'),
            "families_checked": result.get('families_checked'),
            "tasks_created": result.get('tasks_created'),
            "tasks_skipped": result.get('tasks_skipped'),
            "errors": result.get('errors'),
            "message": f"Families checked: {result.get('families_checked')}, Tasks created: {result.get('tasks_created')}"
        }, status=200)
        
    except Exception as e:
        api_logger.error(f"Error in check_monthly_review_tasks endpoint: {str(e)}")
        return JsonResponse({
            "status": "error",
            "error": str(e),
            "message": "Failed to check monthly review tasks"
        }, status=500)
