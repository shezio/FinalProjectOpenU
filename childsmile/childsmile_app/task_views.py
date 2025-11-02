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
from .audit_utils import log_api_action
from .logger import api_logger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@csrf_exempt
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
        api_logger.debug(f"Logged-in user: {user.username}")

        # Check if the user is an admin
        user_is_admin = is_admin(user)
        api_logger.debug(f"Is user '{user.username}' an admin? {user_is_admin}")

        # Always fetch tasks from DB, no cache
        if user_is_admin:
            api_logger.debug("Fetching all tasks for admin user.")
            tasks = (
                Tasks.objects.all()
                .select_related("task_type", "assigned_to", "pending_tutor__id")
                .order_by("-updated_at")
            )
        else:
            api_logger.debug(f"Fetching tasks assigned to user '{user.username}'.")
            tasks = (
                Tasks.objects.filter(assigned_to_id=user_id)
                .select_related("task_type", "assigned_to", "pending_tutor__id")
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
                ),
                "names": task.names,
                "phones": task.phones,
                "other_information": task.other_information,
                "initial_family_data_id_fk": (
                    task.initial_family_data_id_fk.initial_family_data_id
                    if task.initial_family_data_id_fk
                    else None
                ),
            }
            for task in tasks
        ]
        api_logger.debug(f"Fetched tasks: {tasks_data}")
        # Always fetch all task types, no cache
        task_types = Task_Types.objects.all()
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


@csrf_exempt
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


@csrf_exempt
@api_view(["DELETE"])
def delete_task(request, task_id):
    api_logger.info(f"delete_task called for task_id: {task_id}")
    """
    Delete a task.
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
        assigned_to_id = task.assigned_to_id
        pending_tutor_id = task.pending_tutor_id
        task_type = task.task_type
        
        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        # If task type is "ראיון מועמד לחונכות", delete the associated Pending_Tutor
        if task_type and getattr(task_type, "task_type", None) == "ראיון מועמד לחונכות":
            # print all task details for debug
            api_logger.debug(f"Deleting task {task_id} of type {task_type}")
            api_logger.debug(f"Assigned to ID {assigned_to_id}")
            api_logger.debug(f"Pending tutor ID {pending_tutor_id}")
            api_logger.debug(f"Task type {task_type}")
            if pending_tutor_id:
                try:
                    pending_tutor = Pending_Tutor.objects.get(pending_tutor_id=pending_tutor_id)
                    # check if the user has permission to delete the pending tutor
                    if not has_permission(request, "pending_tutor", "DELETE"):
                        log_api_action(
                            request=request,
                            action='DELETE_TASK_FAILED',
                            success=False,
                            error_message="You do not have permission to delete pending tutors",
                            status_code=401,
                            entity_type='Task',
                            entity_ids=[task_id],
                            additional_data={
                                'task_type': task_type.task_type if task_type else 'Unknown',
                                'assigned_to_name': f"{Staff.objects.get(staff_id=assigned_to_id).first_name} {Staff.objects.get(staff_id=assigned_to_id).last_name}" if assigned_to_id else 'Unknown',
                            }
                        )
                        return JsonResponse(
                            {"error": "You do not have permission to delete pending tutors."}, status=401
                        )
                    else:
                        pending_tutor.delete()
                    api_logger.debug(f"Deleted Pending_Tutor with ID {pending_tutor_id}")
                except Pending_Tutor.DoesNotExist:
                    api_logger.debug(f"Pending_Tutor with ID {pending_tutor_id} does not exist")
        
        task.delete()

        # Get assignee name if exists
        assignee_name = None
        assignee_email = None
        if assigned_to_id:
            try:
                assignee = Staff.objects.get(staff_id=assigned_to_id)
                assignee_name = f"{assignee.first_name} {assignee.last_name}"
                assignee_email = assignee.email
            except Staff.DoesNotExist:
                pass

        # Get task type name if exists
        task_type_name = None
        if task_type:
            try:
                task_type_name = task_type.task_type
            except:
                pass

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


@csrf_exempt
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
        old_status = task.status
        new_status = request.data.get("status", task.status)
        task.status = new_status
        task.save()

        api_logger.debug(f"Task {task_id} status updated to {new_status}")

        # If status changed to "בביצוע" and task has initial_family_data_id_fk
        if new_status == "בביצוע" and task.initial_family_data_id_fk:
            # Delete all other tasks with the same initial_family_data_id_fk
            delete_other_tasks_with_initial_family_data_async(task)
        elif new_status == "הושלמה":
            # task_type is a FK to Task_Types, so you can access task.task_type.task_type
            api_logger.debug(f"task_type = {task.task_type.task_type}")
            if task.task_type.task_type == "ראיון מועמד לחונכות":
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


@csrf_exempt
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
        task.updated_at = datetime.datetime.now()

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
