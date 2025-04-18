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
import csv
import datetime
import requests
import urllib3
from django.utils.timezone import make_aware
from geopy.geocoders import Nominatim


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
        return cursor.fetchone() is not None


# def get_hebrew_date(date):
#     res = requests.get(
#         f"https://www.hebcal.com/converter?cfg=json&gy={date.year}&gm={date.month}&gd={date.day}&g2h=1",
#         verify=False,
#         timeout=600,
#     )
#     return res.json()["hebrew"]


def has_permission(request, resource, action):
    """
    Check if the user has the required permission for a specific resource and action.
    """
    permissions = request.session.get("permissions", [])
    # print the permissions for debugging
    print(f"DEBUG: Permissions: {permissions}")  # Debug log
    prefixed_resource = (
        f"childsmile_app_{resource}"  # Add the prefix to the resource name
    )

    return any(
        permission["resource"] == prefixed_resource and permission["action"] == action
        for permission in permissions
    )


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class PermissionsViewSet(viewsets.ModelViewSet):
    queryset = Permissions.objects.all()
    permission_classes = [IsAuthenticated]


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    permission_classes = [IsAuthenticated]


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    permission_classes = [IsAuthenticated]


class SignedUpViewSet(viewsets.ModelViewSet):
    queryset = SignedUp.objects.all()
    permission_classes = [IsAuthenticated]


class General_VolunteerViewSet(viewsets.ModelViewSet):
    queryset = General_Volunteer.objects.all()
    permission_classes = [IsAuthenticated]


class Pending_TutorViewSet(viewsets.ModelViewSet):
    queryset = Pending_Tutor.objects.all()
    permission_classes = [IsAuthenticated]


class TutorsViewSet(viewsets.ModelViewSet):
    queryset = Tutors.objects.all()
    permission_classes = [IsAuthenticated]


class ChildrenViewSet(viewsets.ModelViewSet):
    queryset = Children.objects.all()
    permission_classes = [IsAuthenticated]


class TutorshipsViewSet(viewsets.ModelViewSet):
    queryset = Tutorships.objects.all()
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def match_tutorship(self, request):
        tutor_id = request.data.get("tutor_id")
        child_id = request.data.get("child_id")

        tutor = Tutors.objects.get(id=tutor_id)
        child = Children.objects.get(child_id=child_id)

        geographic_proximity = self.calculate_geographic_proximity(tutor, child)
        gender_match = tutor.gender == child.gender

        if geographic_proximity <= 10 and gender_match:
            tutorship = Tutorships.objects.create(
                tutor=tutor,
                child=child,
                start_date=request.data.get("start_date"),
                status="Active",
                geographic_proximity=geographic_proximity,
                gender_match=gender_match,
            )
            return Response(
                {
                    "tutorship_id": tutorship.id,
                    "tutor_id": tutorship.tutor.id,
                    "child_id": tutorship.child.child_id,
                    "start_date": tutorship.start_date,
                    "status": tutorship.status,
                    "geographic_proximity": tutorship.geographic_proximity,
                    "gender_match": tutorship.gender_match,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"detail": "No suitable match found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def calculate_geographic_proximity(self, tutor, child):
        return 5.0


class MaturesViewSet(viewsets.ModelViewSet):
    queryset = Matures.objects.all()
    permission_classes = [IsAuthenticated]


class HealthyViewSet(viewsets.ModelViewSet):
    queryset = Healthy.objects.all()
    permission_classes = [IsAuthenticated]


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    permission_classes = [IsAuthenticated]


class Tutor_FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Tutor_Feedback.objects.all()
    permission_classes = [IsAuthenticated]


class General_V_FeedbackViewSet(viewsets.ModelViewSet):
    queryset = General_V_Feedback.objects.all()
    permission_classes = [IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Tasks.objects.all()
    permission_classes = [IsAuthenticated]


class PossibleMatchesViewSet(viewsets.ModelViewSet):
    queryset = PossibleMatches.objects.all()
    permission_classes = [IsAuthenticated]


class VolunteerFeedbackReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        feedbacks = General_V_Feedback.objects.all()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="volunteer_feedback_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Volunteer Name", "Feedback Date", "Feedback Content"])
        for feedback in feedbacks:
            writer.writerow(
                [
                    feedback.volunteer_name,
                    feedback.feedback.event_date,
                    feedback.feedback.description,
                ]
            )

        return response


class TutorToFamilyAssignmentReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tutorships = Tutorships.objects.filter(status="Active")
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="tutor_to_family_assignment_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Tutor Name", "Tutee Name"])
        for tutorship in tutorships:
            writer.writerow(
                [
                    tutorship.tutor.staff.username,
                    tutorship.child.childfirstname + " " + tutorship.child.childsurname,
                ]
            )

        return response


class FamiliesWaitingForTutorsReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        children_without_tutors = Children.objects.filter(
            tutorships__isnull=True
        ).distinct()
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="families_waiting_for_tutors_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers"])
        for child in children_without_tutors:
            writer.writerow(
                [
                    child.childfirstname + " " + child.childsurname,
                    child.child_phone_number,
                ]
            )

        return response


class DepartedFamiliesReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        departed_children = Children.objects.filter(tutoring_status="Departed")
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="departed_families_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Child Name",
                "Parents Phone Numbers",
                "Departure Date",
                "Responsible Person",
                "Reason for Departure",
            ]
        )
        for child in departed_children:
            writer.writerow(
                [
                    child.childfirstname + " " + child.childsurname,
                    child.child_phone_number,
                    child.lastupdateddate,  # Assuming this is the departure date
                    child.responsible_coordinator,  # Assuming this is the responsible person
                    child.additional_info,  # Assuming this is the reason for departure
                ]
            )

        return response


class NewFamiliesLastMonthReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        last_month = datetime.date.today() - datetime.timedelta(days=30)
        new_children = Children.objects.filter(registrationdate__gte=last_month)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="new_families_last_month_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Child Name", "Parents Phone Numbers", "Date of Joining"])
        for child in new_children:
            writer.writerow(
                [
                    child.childfirstname + " " + child.childsurname,
                    child.child_phone_number,
                    child.registrationdate,
                ]
            )

        return response


class PotentialTutorshipMatchReportView(View):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tutors = Tutors.objects.filter(tutorships__isnull=True)
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            'attachment; filename="potential_tutorship_match_report.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(
            [
                "Tutor Name",
                "Tutee Name",
                "Tutor Gender",
                "Tutee Gender",
                "Tutor City",
                "Tutee City",
                "Distance",
            ]
        )
        for tutor in tutors:
            for child in Children.objects.all():
                distance = self.calculate_distance(tutor.city, child.city)
                if distance <= 15:
                    writer.writerow(
                        [
                            tutor.staff.username,
                            child.childfirstname + " " + child.childsurname,
                            tutor.gender,
                            child.gender,
                            tutor.city,
                            child.city,
                            distance,
                        ]
                    )

        return response

    def calculate_distance(self, city1, city2):
        return 10.0


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

    # Check if the user has the System Administrator role
    user = Staff.objects.get(staff_id=user_id)

    # Use cache to avoid repeated queries
    cache_key = f"user_tasks_{user_id}" if not is_admin(user) else "all_tasks"
    tasks_data = cache.get(cache_key)

    if not tasks_data:
        # Fetch tasks efficiently
        if is_admin:
            tasks = (
                Tasks.objects.all()
                .select_related("task_type", "assigned_to")
                .order_by("-updated_at")
            )
        else:
            tasks = (
                Tasks.objects.filter(assigned_to_id=user_id)
                .select_related("task_type", "assigned_to")
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
                "pending_tutor": task.pending_tutor_id,
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
        # Fetch the task type to get its name
        task_type = Task_Types.objects.get(id=task_data["type"])

        task = Tasks.objects.create(
            description=task_type.task_type,  # Use the task type name as the description
            due_date=task_data["due_date"],
            status="לא הושלמה",
            created_at=datetime.datetime.now(),
            updated_at=datetime.datetime.now(),
            assigned_to_id=task_data["assigned_to"],
            related_child_id=task_data.get("child"),  # Allow null for child
            related_tutor_id=task_data.get("tutor"),  # Allow null for tutor
            task_type_id=task_data["type"],
            pending_tutor_id=task_data.get(
                "pending_tutor"
            ),  # Allow null for pending tutor
        )

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
        assigned_to_id = request.data.get("assigned_to")
        print(f"DEBUG: assigned_to_id = {assigned_to_id}")  # Debug log
        if assigned_to_id:
            try:
                # Validate the staff_id exists
                Staff.objects.get(staff_id=assigned_to_id)
                task.assigned_to_id = assigned_to_id  # Assign the staff_id directly
            except Staff.DoesNotExist:
                print(
                    f"DEBUG: Staff member with ID '{assigned_to_id}' not found."
                )  # Debug log
                return JsonResponse(
                    {"error": f"Staff member with ID '{assigned_to_id}' not found."},
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
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))

        children = Children.objects.all()
        if from_date:
            children = children.filter(registrationdate__gte=from_date)
        if to_date:
            children = children.filter(registrationdate__lte=to_date)

        geolocator = Nominatim(user_agent="childsmile")
        children_data = []
        for child in children:
            location = geolocator.geocode(child.city)
            children_data.append(
                {
                    "first_name": child.childfirstname,
                    "last_name": child.childsurname,
                    "city": child.city,
                    "latitude": location.latitude if location else None,
                    "longitude": location.longitude if location else None,
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
        one_month_ago = make_aware(datetime.now() - timedelta(days=30))

        # Get date filters from query parameters
        from_date = request.GET.get("from_date")
        to_date = request.GET.get("to_date")

        # Convert from_date and to_date to timezone-aware datetimes
        if from_date:
            from_date = make_aware(datetime.strptime(from_date, "%Y-%m-%d"))
            # Ensure from_date is not older than one month ago
            if from_date < one_month_ago:
                from_date = one_month_ago
        else:
            from_date = one_month_ago  # Default to one month ago if not provided

        if to_date:
            to_date = make_aware(datetime.strptime(to_date, "%Y-%m-%d"))
        else:
            to_date = make_aware(datetime.now())  # Default to the current date

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

        # Insert into either General_Volunteer or Pending_Tutor
        if want_tutor:
            pending_tutor = Pending_Tutor.objects.create(
                id_id=signedup.id,
                pending_status="ממתין",  # "Pending" in Hebrew
            )

            # Create a task for all Tutor Coordinators using the create_task view
            tutor_coordinator_role = Role.objects.filter(
                role_name="Tutor Coordinator"
            ).first()
            if tutor_coordinator_role:
                tutor_coordinators = Staff.objects.filter(roles=tutor_coordinator_role)
                if not tutor_coordinators.exists():
                    print("No Tutor Coordinators found in the database.")
                    return JsonResponse(
                        {"warning": "No Tutor Coordinators found."}, status=204
                    )
                
                for coordinator in tutor_coordinators:
                    # Prepare task data
                    task_data = {
                        "description": "ראיון מועמד לחונכות",
                        "due_date": (
                            now().date() + datetime.timedelta(days=7)
                        ).strftime(
                            "%Y-%m-%d"
                        ),  # Example: 7 days from now
                        "status": "לא הושלמה",  # "Not Completed" in Hebrew
                        "assigned_to": coordinator.staff_id,
                        "pending_tutor": pending_tutor.id,  # Pass the Pending_Tutor ID
                    }

                    # Call the create_task view programmatically
                    request_data = (
                        request._request
                    )  # Get the original Django request object
                    request_data.POST = task_data  # Override POST data
                    create_task(request_data)  # Call the create_task view
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
        pending_tutors = Pending_Tutor.objects.select_related("id").all()  # `id` is the foreign key to SignedUp
        pending_tutors_data = [
            {
                "id": tutor.id_id,  # ID from the SignedUp table
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