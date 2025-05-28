Initial Family Data:
[V] create a model for this table 
class InitialFamilyData(models.Model):
    initial_family_data_id = models.AutoField(primary_key=True)
    names = models.CharField(max_length=500, null=False)
    phones = models.CharField(max_length=500, null=False)
    other_information = models.TextField(max_length=500, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    family_added = models.BooleanField(default=False)
    def __str__(self):
        return f"InitialFamilyData({self.initial_family_data_id}, {self.names}, {self.phones})"
    class Meta:
        db_table = "initial_family_data"

create new migration file that
[V] adds a new DB table in the system called "initial_family_data" with the following fields:
- Initial family data id - auto increment - primary key
- Names - text up to 500 characters - not null
- Phones - text up to 500 characters - not null
- Other information - text up to 500 characters - nullable
- Created at - date time - will always be the time of creation - not null
- Updated at - date time - not null
- Family added - boolean - default false


[V] update tasks model to add the fields names, phones, and other information, and initial_family_data_id as FK to the initial family data table but can be empty
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

[V] create a new migration file that will add the following fields to the Tasks model:
- initial_family_data_id_fk - foreign key to the initial family data table - nullable
- names - text up to 500 characters - nullable
- phones - text up to 500 characters - nullable
- other_information - text up to 500 characters - nullable

volunteer and tutor feedback screens - we need model update and migration for the feedback model
[V] update the feedback model to add the fields names, phones, and other information
class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    feedback_type = models.ForeignKey(Feedback_Types, on_delete=models.CASCADE)
    related_child = models.ForeignKey(Children, on_delete=models.CASCADE, null=True, blank=True)
    related_tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE, null=True, blank=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    names = models.CharField(max_length=500, null=True, blank=True)  # New field
    phones = models.CharField(max_length=500, null=True, blank=True)  # New field
    other_information = models.TextField(max_length=500, null=True, blank=True)  # New field

    def __str__(self):
        return f"Feedback {self.feedback_id} - {self.feedback_type}"

    class Meta:
        db_table = "childsmile_app_feedback"
        indexes = [
            models.Index(fields=["staff_id"], name="idx_feedback_staff_id"),
            models.Index(fields=["created_at"], name="idx_feedback_created_at"),
        ]


Permissions:
[V] give view permission to all the roles in the system
[V] give create permission to:
- Technical Coordinator
- System Administrator
- Tutor
- General Volunteer
- Tutors Coordinator
- Volunteer Coordinator
- Families Coordinator
[V] give update permission to:
- Technical Coordinator
- System Administrator
- Tutor
- General Volunteer
- Tutors Coordinator
- Volunteer Coordinator
- Families Coordinator
[V] give delete permission to:
- Technical Coordinator
- System Administrator
- Families Coordinator

[V] create a new view for the InitialFamilyData model that will return all the data in the table
[V] create a new view for the InitialFamilyData model that will create a new row
[V] create a new view for the InitialFamilyData model that will update an existing row by id
[V] create a new view for the InitialFamilyData model that will delete an existing row by id
create urls for each of the views
[V] URL for the InitialFamilyData model that will return all the data in the table
[V] URL for the InitialFamilyData model that will create a new row
[V] URL for the InitialFamilyData model that will update an existing row by id
[V] URL for the InitialFamilyData model that will delete an existing row by id

[V] add to ALL views relating tasks the new fields in the model - names,    initial_family_data_id_fk, phones, other_information
- add the new fields to the GET view of tasks
- add the new fields to the POST view of tasks
- add the new fields to the PUT view of tasks
- add the new fields to the DELETE view of tasks



[v] add the new fields to the GET view of tutor feedback
[v] add the new fields to the POST view of tutor feedback
[v] add the new fields to the PUT view of tutor feedback
[v] add the new fields to the DELETE view of tutor feedback

[v] add the new fields to the GET view of volunteer feedback
[v] add the new fields to the POST view of volunteer feedback
[v] add the new fields to the PUT view of volunteer feedback
[v] add the new fields to the DELETE view of volunteer feedback

[v] add the new fields to the GET view of tutor_feedback_report
[v] add the new fields to the POST view of tutor_feedback_report
[v] add the new fields to the PUT view of tutor_feedback_report
[v] add the new fields to the DELETE view of tutor_feedback_report

[v] add the new fields to the GET view of volunteer_feedback_report
[v] add the new fields to the POST view of volunteer_feedback_report
[v] add the new fields to the PUT view of volunteer_feedback_report
[v] add the new fields to the DELETE view of volunteer_feedback_report



volunteer and tutor feedback screens - on general_volunteer_hospital_visit feedback type ONLY
[V] add a <h2> called initial family data with 3 fields: names, phone, and other information
[v] once the feedback is submitted - only on create not edit - POST only
[v] add the data to the initial family data table
[v] create automatically a task to all Technical Coordinators to add a family - if names and phones both aren't empty

[V] make it automatic that upon creating of a general_volunteer_hospital_visit feedback - if the fields names and phones both arent empty - then create a task to all Technical Coordinators to add a family with the  - but ONLY AFTER the initial_familty_data new line was added
to utilize the initial_family_data_id

following data for staff ids of the technical coordinators in the system:
[v] description - "הוספת משפחה"
[v] due_date - now + 7 days
[v] status - "לא הושלמה"
[v] created_at - now
[v] updated_at - now
[v] assigned_to_id - current staff id
[v] related_child_id - null
[v] related_tutor_id - null
[v] task_type_id - the id of the task type "הוספת משפחה"
[v] pending_tutor_id - null
[v] names - the names inserted in the feedback
[v] phones- the phones inserted in the feedback
[v] other_information - the other information inserted in the feedback
[v] initial_family_data_id_fk - the id of the initial family data created
[V] show the new fields in the split view for the task


volunteer and tutor feedback reports-  need to add new fields to the feedback report FE
[v] add the names field to the feedback report
[v] add the phones field to the feedback report
[v] add the other information field to the feedback report



UI
[v] add in App.js a new page called "InitialFamilyData" 

------------------------------------------------------------------------------
# TODO
------------------------------------------------------------------------------

BE additions:

UI:
[] fix pins on families report locations
[V] fix feedback report bugs of column order - and make sure we have the initfamilydata column in both
[] add a new button in the families page that will open the initial family data page and navigate to "/initial-family-data"


[] create a new page under families called "InitialFamilyData" that will show all the data in the table using "api/get_initial_family_data/",
[] in the new page show all the data in a table with the following columns:
[] Initial Family ID, Name, Phone, Other information, created_at, updated_at, Family Added?, actions
[] in the actions column add a button that will open a modal with a form to update the initial family data - update will use         "api/update_initial_family_data/<int:family_id>/",
[] in the actions column add a button that will open a modal with a form to create a new initial family data - create will use "api/create_initial_family_data/"
[] in the actions column add a button that will open a modal asking  - the scary modal we have in families - to delete the initial family data - delete will use "api/delete_initial_family_data/<int:family_id>/",
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