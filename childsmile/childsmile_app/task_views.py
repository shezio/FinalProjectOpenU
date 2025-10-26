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

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

@csrf_exempt
@api_view(["GET"])
def get_user_tasks(request):
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
        print(f"DEBUG: Logged-in user: {user.username}")  # Debug log

        # Check if the user is an admin
        user_is_admin = is_admin(user)
        print(f"DEBUG: Is user '{user.username}' an admin? {user_is_admin}")  # Debug log

        # Always fetch tasks from DB, no cache
        if user_is_admin:
            print("DEBUG: Fetching all tasks for admin user.")  # Debug log
            tasks = (
                Tasks.objects.all()
                .select_related("task_type", "assigned_to", "pending_tutor__id")
                .order_by("-updated_at")
            )
        else:
            print(f"DEBUG: Fetching tasks assigned to user '{user.username}'.")  # Debug log
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

        return JsonResponse({"tasks": tasks_data, "task_types": task_types_data})

    except Staff.DoesNotExist:
        log_api_action(
            request=request,
            action='VIEW_TASKS_FAILED',
            success=False,
            error_message="User not found",
            status_code=404
        )
        return JsonResponse({"error": "User not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred while fetching tasks: {str(e)}")
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
    """
    Create a new task.
    """
    print(" create task data: ", request.data)  # Debug log
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
                    status_code=400
                )
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
                        print(
                            f"DEBUG: Created new Pending_Tutor with ID {pending_tutor_id}"
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
                status_code=400
            )
            return JsonResponse({"detail": "Invalid task type ID."}, status=400)
        except Exception as e:
            print(f"DEBUG: Error in Pending_Tutor creation logic: {str(e)}")

        print(f"DEBUG: Task data being sent to create_task_internal: {task_data}")
        task = create_task_internal(task_data)

        # Check if the logged-in user is an admin
        user = Staff.objects.get(staff_id=user_id)

        log_api_action(
            request=request,
            action='CREATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True,
            additional_data={
                'task_type': task_type_obj.task_type if 'task_type_obj' in locals() else None,
                'assigned_to': task_data.get("assigned_to")
            }
        )

        return JsonResponse({"task_id": task.task_id}, status=201)
    except Task_Types.DoesNotExist:
        return JsonResponse({"detail": "Invalid task type ID."}, status=400)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
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
            print(f"DEBUG: Deleting task {task_id} of type {task_type}")
            print(f"DEBUG: Assigned to ID {assigned_to_id}")
            print(f"DEBUG: Pending tutor ID {pending_tutor_id}")
            print(f"DEBUG: Task type {task_type}")
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
                            status_code=401
                        )
                        return JsonResponse(
                            {"error": "You do not have permission to delete pending tutors."}, status=401
                        )
                    else:
                        pending_tutor.delete()
                    print(f"DEBUG: Deleted Pending_Tutor with ID {pending_tutor_id}")
                except Pending_Tutor.DoesNotExist:
                    print(f"DEBUG: Pending_Tutor with ID {pending_tutor_id} does not exist")
        
        task.delete()

        log_api_action(
            request=request,
            action='DELETE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task_id],
            success=True
        )

        return JsonResponse({"message": "Task deleted successfully."}, status=200)
    except Tasks.DoesNotExist:
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message="Task not found",
            status_code=404
        )
        return JsonResponse({"error": "Task not found."}, status=404)
    except Exception as e:
        print(f"DEBUG: An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='DELETE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@api_view(["PUT"])
def update_task_status(request, task_id):
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

        print(f"DEBUG: Task {task_id} status updated to {new_status}")  # Debug log

        # If status changed to "בביצוע" and task has initial_family_data_id_fk
        if new_status == "בביצוע" and task.initial_family_data_id_fk:
            # Delete all other tasks with the same initial_family_data_id_fk
            delete_other_tasks_with_initial_family_data_async(task)
        elif new_status == "הושלמה":
            # task_type is a FK to Task_Types, so you can access task.task_type.task_type
            print(f"DEBUG: task_type = {task.task_type.task_type}")
            if task.task_type.task_type == "ראיון מועמד לחונכות":
                # pending_tutor is a FK to Pending_Tutor
                if task.pending_tutor:
                    print(
                        f"DEBUG: pending_tutor_id = {task.pending_tutor.pending_tutor_id}"
                    )
                    ok, msg = promote_pending_tutor_to_tutor(task)
                    print(f"DEBUG: Promotion called, result: {ok}, {msg}")
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

        log_api_action(
            request=request,
            action='UPDATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True,
            additional_data={
                'old_status': old_status,
                'new_status': new_status
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
        print(f"DEBUG: An error occurred: {str(e)}")
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

        # Update task fields
        task.description = request.data.get("description", task.description)
        task.due_date = request.data.get("due_date", task.due_date)
        new_status = request.data.get("status", task.status)
        if new_status:
            task.status = new_status
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
                log_api_action(
                    request=request,
                    action='UPDATE_TASK_FAILED',
                    success=False,
                    error_message=f"Staff member with username or ID '{assigned_to}' not found",
                    status_code=400
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

        # Handle pending_tutor_id
        task.pending_tutor_id = request.data.get("pending_tutor", task.pending_tutor_id)

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
                            status_code=400
                        )
                        return JsonResponse(
                            {"Error promoting pending tutor": msg}, status=400
                        )

        log_api_action(
            request=request,
            action='UPDATE_TASK_SUCCESS',
            affected_tables=['childsmile_app_tasks'],
            entity_type='Task',
            entity_ids=[task.task_id],
            success=True
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
        print(f"DEBUG: An error occurred: {str(e)}")
        log_api_action(
            request=request,
            action='UPDATE_TASK_FAILED',
            success=False,
            error_message=str(e),
            status_code=500
        )
        return JsonResponse({"error": str(e)}, status=500)
