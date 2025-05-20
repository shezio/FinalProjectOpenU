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
                    {
                        "detail": f"Staff member with ID or username '{assigned_to}' not found."
                    },
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
if the task type is "ראיון מועמד לחונכות" and the new status is "הושלמה"
add remove the id of the role of General Volunteer from roles field in staff table of the user that was pending an interview -       pending_tutor: selectedPendingTutor?.value, // Send the correct pending_tutor_id

and in staff table give it a Tutor role id
then insert a new line in tutors table:
id_id= id_id value it has in the pending tutor table
staff_id = staff_id in staff table on row that matches the email in staff table and email in the signedup table  - going to signedup table by using id_id in pending tutors table which is id in signedup table
the tutorship_status is "אין_חניך"
tutor_email = email in signedup table
only then dlete the line from pending tutors table

same goes for update task if status has changed to "הושלמה" and task type is "ראיון מועמד לחונכות"

delete task - if the task type is "ראיון מועמד לחונכות"
remove the line in pending tutors table and set roles field in staff table of the user that was pending an interview to General Volunteer if it does not have that role already

create task - if the task type is "ראיון מועמד לחונכות" and there is no line in pending tutors table
create a new line in pending tutors table with the id of the user that was assigned to the task




now about update_tutorship

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
        return JsonResponse(
            {"error": "This role has already approved this tutorship"}, status=400
        )
    try:
        tutorship.last_approver.append(staff_role_id)
        if tutorship.approval_counter <= 2:
            tutorship.approval_counter = len(tutorship.last_approver)
        else:
            raise ValueError("Approval counter cannot exceed 2")
        tutorship.updated_at = datetime.datetime.now()  # Updated to use datetime now()
        tutorship.save()

        return JsonResponse(
            {
                "message": "Tutorship updated successfully",
                "approval_counter": tutorship.approval_counter,
            },
            status=200,
        )
    except Exception as e:
        print(f"DEBUG: An error occurred while updating the tutorship: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
 need to update tutorship_status of the tutor to "יש_חניך"
 update the relationship_status of the tutor to the marital_status of the child
 update the tutee_wellness to the current_medical_state of the child

 then tutoring_status of the child to "יש_חונך"

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

 need to update tutorship_status of the tutor to "אין_חניך"
 update the relationship_status of the tutor to null
 update the tutee_wellness to null

 then tutoring_status of the child to "למצוא_חונך_בעדיפות_גבוה"

 
 in update family
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

  update to marital_status of the child - update the relationship_status of the tutor to the marital_status of the child
    update to current_medical_state of the child - update the tutee_wellness to the current_medical_state of the child



add search by name in the matching wizard modal
change the questions in the feedback
add more feedback types
fix the feedback modal sizing with the buttons
