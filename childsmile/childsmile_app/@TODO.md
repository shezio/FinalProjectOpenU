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

Volunteer Feedback - Change feedback page to NOT have 2 cards but show the feedback types by permissions
 - meaning that if the user has not a tutor role then show only the feedback types that are not related to tutor - which are:
  - general_volunteer_hospital_visit
  - fun_day_general_volunteer

Initial Family Data:
[V] create a model for this table 
class InitialFamilyData(models.Model):
    initial_family_data_id = models.AutoField(primary_key=True)
    names = models.CharField(max_length=50, null=False)
    phones = models.CharField(max_length=50, null=False)
    other_information = models.TextField(max_length=500, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    family_added = models.BooleanField(default=False)
    def __str__(self):
        return f"InitialFamilyData({self.initial_family_data_id}, {self.names}, {self.phones})"
    class Meta:
        db_table = "initial_family_data"




create new migration file that
[] adds a new DB table in the system called "initial_family_data" with the following fields:
- Initial family data id - auto increment - primary key
- Names - text up to 50 characters - not null
- Phones - text up to 50 characters - not null
- Other information - text up to 500 characters - nullable
- Created at - date time - will always be the time of creation - not null
- Updated at - date time - not null
- Family added - boolean - default false


[] update tasks model to add the fields names, phones, and other information, and initial_family_data_id as FK to the initial family data table but can be empty
class Tasks(models.Model):
    task_id = models.AutoField(primary_key=True)
    task_type = models.ForeignKey(Task_Types, on_delete=models.CASCADE)
    description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(max_length=255, default="Pending")
    assigned_to = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="tasks")
    related_child = models.ForeignKey(Children, on_delete=models.CASCADE, null=True, blank=True)
    related_tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # add pending_tutor_id field need to add a column to tasks table and model thats called new_pending_tutor_id it can be empty but values must be from pending_tutor table
    pending_tutor = models.ForeignKey(Pending_Tutor, on_delete=models.SET_NULL, null=True, blank=True, db_column='pending_tutor_id_id')  # Specify the column name in the database
    initial_family_data_id_fk = models.ForeignKey(InitialFamilyData, on_delete=models.SET_NULL, null=True, blank=True)
    names = models.CharField(max_length=50, null=True, blank=True)
    phones = models.CharField(max_length=50, null=True, blank=True)
    other_information = models.TextField(max_length=500, null=True, blank=True)
    initial_family_data_id_fk = models.ForeignKey(InitialFamilyData, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Task {self.task_id} - {self.task_type}"
    
    class Meta:
        db_table = "childsmile_app_tasks"
        indexes = [
            models.Index(fields=["assigned_to_id"], name="idx_tasks_assigned_to_id"),
            models.Index(fields=["updated_at"], name="idx_tasks_updated_at"),
            # add index to the new field initial_family_data_id_fk
            models.Index(fields=["initial_family_data_id_fk"], name="idx_tasks_initial_family_data_id_fk"),
        ]



add to views of tasks the new fields:
- initial_family_data_id_fk - foreign key to the initial family data table - nullable
- names - text up to 50 characters - nullable
- phones - text up to 50 characters - nullable
- other_information - text up to 500 characters - nullable
[] add the new fields to the GET view of tasks
[] add the new fields to the POST view of tasks
[] add the new fields to the PUT view of tasks
[] add the new fields to the DELETE view of tasks

BE additions:
[] create a new view for the InitialFamilyData model that will return all the data in the table
[] create a new view for the InitialFamilyData model that will create a new row
[] create a new view for the InitialFamilyData model that will update an existing row by id
[] create a new view for the InitialFamilyData model that will delete an existing row by id
[] create create, update, delete and get views for this InitialFamilyData model
create urls for each of the views
[] URL for the InitialFamilyData model that will return all the data in the table
[] URL for the InitialFamilyData model that will create a new row
[] URL for the InitialFamilyData model that will update an existing row by id
[] URL for the InitialFamilyData model that will delete an existing row by id

volunteer and tutor feedback screens - on general_volunteer_hospital_visit feedback type ONLY
[] add a <h2> called initial family data with 3 fields: names, phone, and other information
[] once the feedback is submitted - only on create not edit - POST only
[] add the data to the initial family data table
[] create automatically a task to all Technical Coordinators to add a family - if names and phones are both not empty

volunteer and tutor feedback reports-  need to add new fields to the feedback report
[] add the names field to the feedback report
[] add the phones field to the feedback report
[] add the other information field to the feedback report

Tasks:
[] add the fields to the task of adding a family once the type was chosen and add a dummy condition which is always false until we decide to show this entire feature
[] make it automatic that upon creating of a general_volunteer_hospital_visit feedback - if the fields names and phones both arent empty - then create a task to all Technical Coordinators to add a family with the  - but ONLY AFTER the initial_familty_data new line was added
to utilize the initial_family_data_id

following data for staff ids of the technical coordinators in the system:
[] description - "הוספת משפחה"
[] due_date - now + 7 days
[] status - "לא הושלמה"
[] created_at - now
[] updated_at - now
[] assigned_to_id - current staff id
[] related_child_id - null
[] related_tutor_id - null
[] task_type_id - the id of the task type "הוספת משפחה"
[] pending_tutor_id - null
[] names - the names inserted in the feedback
[] phones- the phones inserted in the feedback
[] other_information - the other information inserted in the feedback
[] initial_family_data_id_fk - the id of the initial family data created

[] when one task with that initial_family_data_id_fk status is set to "בביצוע" - then all the other tasks with that initial_family_data_id_fk will be deleted

Permissions:
[] give view permission to all the roles in the system
[] give create permission to technical coordinator, system administrator, tutor, and general volunteer, and their coordinators, and family coordinator
[] give update permission to technical coordinator, system administrator, tutor, and general volunteer, and their coordinators, and family coordinator
[] give delete permission to technical coordinator, system administrator and family coordinator

UI:
[] create a new page under families called "initial_family_data" that will show all the data in the table
[] add in App.js a new page called "InitialFamilyData" that will show all the data in the table
[] add a new button in the families page that will open the initial family data page and navigate to it
[] in the new page show all the data in a table with the following columns:
[] Initial Family ID, Name, Phone, Other information, created_at, updated_at, Family Added?, actions
[] in the actions column add a button that will open a modal with a form to update the initial family data
[] in the actions column add a button that will delete the initial family data
[] in the actions column add a button to mark the family as added
 - if added
  - show it as done - set family_added = true
  - automatically set the status of the task to "הושלמה" - where initial_family_data_id_fk in Tasks = initial_family_data_id in InitialFamilyData
 - if deleted
  - then delete the task if its status was "הושלמה" by the initial_family_data_id_fk

[] the table will be a data grid in a grid container under families-main-content
[] above it there will be the filter-create-container with
    - button to create a new initial family data
    - button to refresh the data
    - date range filter buttons to filter the data by created_at
    - filter by family_added
[] the data grid will have a search bar to search by names and phone
[] the data grid will have pagination
[] the date columns both will be sortable
[] each tr will be pale green if the family_added is true otherwise white

[] create modal design will be similar to the one in the feedback
[] create modal will have a form with the following fields:
    - names - with a placeholder "Enter names", and a validation that more than 10 characters has to be at least one comma
    - phones - with a placeholder "Enter phones", and a validation that more than 10 characters has to be at least one comma
    - other information - no validation
[] update modal will be similar to the create modal but with the data filled in
  - only on update we must also validate that the names and phones are not empty
[] delete modal will ask if you are sure you want to delete this initial family data - like all the scary delete modals - we can use the delete family modal we already have - its convenient since all the CSS already exists
[] mark as added modal will ask if you are sure you want to mark this initial family data as added? and state this will auto update the task status to "הושלמה" and delete the task if it was "הושלמה" - like all the scary delete modals - we can use the delete family modal we already have - its convenient since all the CSS already exists
[] in the update modal - if you change the names or phones or other information - then it will update the task with the initial_family_data_id_fk