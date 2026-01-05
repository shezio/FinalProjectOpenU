from django.db import models
import random
import string
from django.utils import timezone
from datetime import timedelta

"""
models to appear in the admin panel
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
    InitialFamilyData
)

"""


class MaritalStatus(models.TextChoices):
    MARRIED = "נשואים", "Married"
    DIVORCED = "גרושים", "Divorced"
    SEPARATED = "פרודים", "Separated"
    NONE = "אין", "None"


class TutoringStatus(models.TextChoices):
    FIND_TUTOR = "למצוא_חונך", "Find Tutor"
    NOT_WANTED = "לא_רוצים", "Not Wanted"
    NOT_RELEVANT = "לא_רלוונטי", "Not Relevant"
    MATURE = "בוגר", "Mature"
    HAS_TUTOR = "יש_חונך", "Has Tutor"
    FIND_TUTOR_NO_AREA = "למצוא_חונך_אין_באיזור_שלו", "Find Tutor No Area"
    FIND_TUTOR_HIGH_PRIORITY = "למצוא_חונך_בעדיפות_גבוה", "Find Tutor High Priority"
    MATCH_QUESTIONABLE = "שידוך_בסימן_שאלה", "Match Questionable"


class TutorshipStatus(models.TextChoices):
    HAS_TUTEE = "יש_חניך", "Has Tutee"
    NO_TUTEE = "אין_חניך", "No Tutee"
    NOT_AVAILABLE = "לא_זמין_לשיבוץ", "Not Available for Assignment"


class Role(models.Model):
    role_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.role_name

    class Meta:
        db_table = "childsmile_app_role"


class Permissions(models.Model):
    permission_id = models.AutoField(primary_key=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    resource = models.CharField(max_length=255)
    action = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.role} - {self.resource} - {self.action}"

    class Meta:
        db_table = "childsmile_app_permissions"


class Staff(models.Model):
    staff_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    roles = models.ManyToManyField(Role, related_name="staff_members")
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    registration_approved = models.BooleanField(default=False)
    # INACTIVE STAFF FEATURE: Track active/inactive status
    is_active = models.BooleanField(default=True)
    previous_roles = models.JSONField(default=None, null=True, blank=True)  # {"role_ids": [1, 3, 5]}
    deactivation_reason = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return self.username

    class Meta:
        db_table = "childsmile_app_staff"


class SignedUp(models.Model):
    id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    age = models.IntegerField()
    gender = models.BooleanField()
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=255)
    comment = models.TextField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    want_tutor = models.BooleanField()

    def __str__(self):
        return f"{self.first_name} {self.surname}"

    class Meta:
        db_table = "childsmile_app_signedup"


class General_Volunteer(models.Model):
    id = models.OneToOneField(SignedUp, on_delete=models.CASCADE, primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    signupdate = models.DateField()
    comments = models.TextField(null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"General Volunteer {self.id.first_name} {self.id.surname}"

    class Meta:
        db_table = "childsmile_app_general_volunteer"


class Pending_Tutor(models.Model):
    pending_tutor_id = models.AutoField(primary_key=True)
    id = models.ForeignKey(SignedUp, on_delete=models.CASCADE)
    pending_status = models.CharField(max_length=255)

    def __str__(self):
        return f"Pending Tutor {self.id.first_name} {self.id.surname}"

    class Meta:
        db_table = "childsmile_app_pending_tutor"


class Tutors(models.Model):
    id = models.OneToOneField(SignedUp, on_delete=models.CASCADE, primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    tutorship_status = models.CharField(max_length=255, choices=TutorshipStatus.choices)
    preferences = models.TextField(null=True, blank=True)
    tutor_email = models.EmailField(null=True, blank=True)
    relationship_status = models.CharField(
        max_length=20, choices=MaritalStatus.choices, null=True, blank=True
    )
    tutee_wellness = models.CharField(max_length=255, null=True, blank=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tutor {self.id.first_name} {self.id.surname}"

    class Meta:
        db_table = "childsmile_app_tutors"


class Children(models.Model):
    child_id = models.BigIntegerField(
        primary_key=True, unique=True
    )  # Updated to BigIntegerField
    childfirstname = models.CharField(max_length=255)
    childsurname = models.CharField(max_length=255)
    registrationdate = models.DateField()
    lastupdateddate = models.DateField(auto_now=True)
    gender = models.BooleanField()
    responsible_coordinator = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    child_phone_number = models.CharField(max_length=20)
    treating_hospital = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    medical_diagnosis = models.CharField(max_length=255, null=True, blank=True)
    diagnosis_date = models.DateField(null=True, blank=True)
    marital_status = models.CharField(max_length=50)
    num_of_siblings = models.IntegerField()
    details_for_tutoring = models.TextField()
    additional_info = models.TextField(null=True, blank=True)
    tutoring_status = models.CharField(max_length=50)
    current_medical_state = models.CharField(
        max_length=255, null=True, blank=True
    )  # New field
    when_completed_treatments = models.DateField(null=True, blank=True)  # New field
    father_name = models.CharField(max_length=255, null=True, blank=True)  # New field
    father_phone = models.CharField(max_length=20, null=True, blank=True)  # New field
    mother_name = models.CharField(max_length=255, null=True, blank=True)  # New field
    mother_phone = models.CharField(max_length=20, null=True, blank=True)  # New field
    street_and_apartment_number = models.CharField(
        max_length=255, null=True, blank=True
    )  # New field
    expected_end_treatment_by_protocol = models.DateField(
        null=True, blank=True
    )  # New field
    has_completed_treatments = models.BooleanField(null=True, blank=True)  # New field
    status = models.CharField(
        max_length=20,
        default="טיפולים",
        choices=[
            ("טיפולים", "טיפולים"),
            ("מעקבים", "מעקבים"),
            ("אחזקה", "אחזקה"),
            ("ז״ל", "ז״ל"),
            ("בריא", "בריא"),
        ],
        null=False,
        blank=False,
    )
    # Track last review talk conducted date for monthly follow-up tasks
    last_review_talk_conducted = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.childfirstname} {self.childsurname}"

    @property
    def age(self):
        from datetime import date

        return (
            date.today().year
            - self.date_of_birth.year
            - (
                (date.today().month, date.today().day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )

    class Meta:
        db_table = "childsmile_app_children"


class Tutorships(models.Model):
    id = models.AutoField(primary_key=True)
    child = models.ForeignKey(Children, on_delete=models.CASCADE)
    tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE)
    created_date = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    approval_counter = models.SmallIntegerField(default=0)
    last_approver = models.JSONField(default=list)  # Store role IDs as a list
    # INACTIVE STAFF FEATURE: Track tutorship activation status
    tutorship_activation = models.CharField(
        max_length=50,
        choices=[
            ('pending_first_approval', 'Pending First Approval'),
            ('active', 'Active'),
            ('inactive', 'Inactive'),
        ],
        default='pending_first_approval'
    )

    def __str__(self):
        return f"Tutorship {self.id} - Child {self.child.child_id} - Tutor {self.tutor.id} - Created on {self.created_date}"

    class Meta:
        db_table = "childsmile_app_tutorships"


class Matures(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    child = models.OneToOneField(Children, on_delete=models.CASCADE, primary_key=True)
    full_address = models.CharField(max_length=255)
    current_medical_state = models.CharField(max_length=255, null=True, blank=True)
    when_completed_treatments = models.DateField(null=True, blank=True)
    parent_name = models.CharField(max_length=255, null=True, blank=True)
    parent_phone = models.CharField(max_length=20, null=True, blank=True)
    additional_info = models.TextField(null=True, blank=True)
    general_comment = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Mature {self.child.childfirstname} {self.child.childsurname}"

    class Meta:
        db_table = "childsmile_app_matures"


class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    event_date = models.DateTimeField()
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    description = models.TextField()
    exceptional_events = models.TextField(null=True, blank=True)
    anything_else = models.TextField(null=True, blank=True)
    comments = models.TextField(null=True, blank=True)
    feedback_type = models.CharField(
        max_length=50,
        choices=[
            ("tutor_fun_day", "Tutor Fun Day"),
            ("general_volunteer_fun_day", "General Volunteer Fun Day"),
            ("general_volunteer_hospital_visit", "General Volunteer Hospital Visit"),
            ("general_house_visit", "General House Visit"),
            ("tutorship", "Tutorship"),
        ],
        default="tutorship",
    )
    hospital_name = models.CharField(max_length=50, null=True, blank=True)  # New field
    additional_volunteers = models.TextField(null=True, blank=True)  # New field
    # New fields for initial family data feedback
    names = models.CharField(max_length=500, null=True, blank=True)
    phones = models.CharField(max_length=500, null=True, blank=True)
    other_information = models.TextField(max_length=500, null=True, blank=True)

    def __str__(self):
        return f"Feedback {self.feedback_id} by {self.staff.username}"

    class Meta:
        db_table = "childsmile_app_feedback"


class Tutor_Feedback(models.Model):
    feedback = models.OneToOneField(
        Feedback,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="feedback_id_id",  # חשוב: זה מורה לדג'אנגו לקרוא לעמודה feedback_id
    )
    tutee_name = models.CharField(max_length=255)
    tutor_name = models.CharField(max_length=255)
    tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE)
    is_it_your_tutee = models.BooleanField()
    is_first_visit = models.BooleanField()

    def __str__(self):
        return f"Tutor Feedback {self.feedback.feedback_id} by {self.tutor_name}"

    class Meta:
        db_table = "childsmile_app_tutor_feedback"


class General_V_Feedback(models.Model):
    feedback = models.OneToOneField(
        Feedback,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="feedback_id_id",  # חשוב: זה מורה לדג'אנגו לקרוא לעמודה feedback_id
    )
    volunteer_name = models.CharField(max_length=255)
    volunteer = models.ForeignKey(General_Volunteer, on_delete=models.CASCADE)
    child_name = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"General Volunteer Feedback {self.feedback.feedback_id} by {self.volunteer_name}"

    class Meta:
        db_table = "childsmile_app_general_v_feedback"


class PossibleMatches(models.Model):
    match_id = models.AutoField(primary_key=True)
    child_id = models.BigIntegerField()
    tutor_id = models.IntegerField()
    child_full_name = models.CharField(max_length=255)
    tutor_full_name = models.CharField(max_length=255)
    child_city = models.CharField(max_length=255)
    tutor_city = models.CharField(max_length=255)
    child_age = models.IntegerField()
    tutor_age = models.IntegerField()
    child_gender = models.BooleanField()
    tutor_gender = models.BooleanField()
    distance_between_cities = models.IntegerField(default=0)
    grade = models.IntegerField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"Possible Match {self.match_id} - Child {self.child_full_name} - Tutor {self.tutor_full_name}"

    class Meta:
        db_table = "childsmile_app_possiblematches"


class InitialFamilyData(models.Model):
    initial_family_data_id = models.AutoField(primary_key=True, auto_created=True)
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


class Task_Types(models.Model):
    task_type = models.CharField(max_length=255, unique=True)
    resource = models.CharField(max_length=255, null=True)  # New field
    action = models.CharField(max_length=50, null=True)  # New field

    def __str__(self):
        return self.task_type

    class Meta:
        db_table = "childsmile_app_task_types"


class Tasks(models.Model):
    task_id = models.AutoField(primary_key=True)
    task_type = models.ForeignKey(Task_Types, on_delete=models.CASCADE)
    description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(max_length=255, default="Pending")
    assigned_to = models.ForeignKey(
        Staff, on_delete=models.CASCADE, related_name="tasks"
    )
    related_child = models.ForeignKey(
        Children, on_delete=models.CASCADE, null=True, blank=True
    )
    related_tutor = models.ForeignKey(
        Tutors, on_delete=models.CASCADE, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    pending_tutor = models.ForeignKey(
        Pending_Tutor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="pending_tutor_id_id",
    )
    # New fields for initial family data
    initial_family_data_id_fk = models.ForeignKey(
        InitialFamilyData,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        db_column="initial_family_data_id_fk",
    )
    names = models.CharField(max_length=500, null=True, blank=True)
    phones = models.CharField(max_length=500, null=True, blank=True)
    other_information = models.TextField(max_length=500, null=True, blank=True)
    # New field for storing user info in registration approval tasks
    user_info = models.JSONField(null=True, blank=True)
    # Field for storing rejection reason when registration is rejected
    rejection_reason = models.TextField(max_length=200, null=True, blank=True)

    def __str__(self):
        return f"Task {self.task_id} - {self.task_type}"

    class Meta:
        db_table = "childsmile_app_tasks"
        indexes = [
            models.Index(fields=["assigned_to_id"], name="idx_tasks_assigned_to_id"),
            models.Index(fields=["updated_at"], name="idx_tasks_updated_at"),
            models.Index(
                fields=["initial_family_data_id_fk"],
                name="idx_tasks_init_family_data_fk",
            ),
        ]


class CityGeoDistance(models.Model):
    city1 = models.CharField(max_length=255, db_index=True)
    city2 = models.CharField(max_length=255, db_index=True)
    city1_latitude = models.FloatField(null=True, blank=True)
    city1_longitude = models.FloatField(null=True, blank=True)
    city2_latitude = models.FloatField(null=True, blank=True)
    city2_longitude = models.FloatField(null=True, blank=True)
    distance = models.IntegerField(null=True, blank=True)  # in km
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "childsmile_app_citygeodistance"
        unique_together = ("city1", "city2")
        indexes = [
            models.Index(fields=["city1", "city2"], name="idx_city1_city2"),
        ]

    def __str__(self):
        return f"{self.city1} <-> {self.city2}: {self.distance}km"


class PrevTutorshipStatuses(models.Model):
    prev_id = models.AutoField(primary_key=True, serialize=False)
    tutor_id = models.ForeignKey(Tutors, on_delete=models.CASCADE, null=False)
    child_id = models.ForeignKey(Children, on_delete=models.CASCADE, null=False)
    tutor_tut_status = models.CharField(max_length=50, null=False)
    child_tut_status = models.CharField(max_length=50, null=False)
    last_updated = models.DateTimeField(auto_now=True)
    tutorship_id = models.ForeignKey(Tutorships, on_delete=models.CASCADE, null=True)

    def __str__(self):
        return f"PrevTutorshipStatus {self.prev_id} - Tutor {self.tutor.id} - Child {self.child.child_id}"

    class Meta:
        db_table = "childsmile_app_prevtutorshipstatuses"


class TOTPCode(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)

    class Meta:
        db_table = 'totp_codes'

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=5)

    def is_valid(self):
        return not self.used and not self.is_expired() and self.attempts < 3

    @staticmethod
    def generate_code():
        return ''.join(random.choices(string.digits, k=6))

class PrevTaskStatuses(models.Model):
    prev_task_id = models.AutoField(primary_key=True, serialize=False)
    task_id = models.BigIntegerField()  # FK to Tasks.task_id (not a direct FK to allow soft deletes)
    previous_status = models.CharField(max_length=255)
    new_status = models.CharField(max_length=255)
    task_snapshot = models.JSONField()  # Stores entire task details before status change for reverting
    changed_by = models.ForeignKey(Staff, on_delete=models.CASCADE)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PrevTaskStatus {self.prev_task_id} - Task {self.task_id} - {self.previous_status} → {self.new_status}"

    class Meta:
        db_table = "childsmile_app_prevtaskstatuses"
        indexes = [
            models.Index(fields=["task_id"], name="idx_prevtaskstatus_task_id"),
            models.Index(fields=["changed_at"], name="idx_prevtaskstatus_changed_at"),
        ]


class AuditLog(models.Model):
    # Primary key
    audit_id = models.AutoField(primary_key=True)
    
    # User information (indexed for performance)
    user_email = models.EmailField(max_length=255, db_index=True)
    username = models.CharField(max_length=150, db_index=True)
    
    # Timestamp (indexed for performance - most common query filter)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Action information (indexed for performance)
    action = models.CharField(max_length=100, db_index=True)  # CREATE, UPDATE, DELETE, VIEW, etc.
    endpoint = models.CharField(max_length=255)  # API endpoint called
    method = models.CharField(max_length=10)  # GET, POST, PUT, DELETE
    
    # Database impact
    affected_tables = models.JSONField(default=list)  # List of table names
    
    # User permissions at time of action
    user_roles = models.JSONField(default=list)  # User's roles at time of action
    permissions = models.JSONField(default=list)  # Specific permissions checked
    
    # Entity details
    entity_type = models.CharField(max_length=100, null=True, blank=True)  # e.g., 'Staff', 'Volunteer'
    entity_ids = models.JSONField(default=list)  # IDs of affected entities
    
    # Request details
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    # Response details
    status_code = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    
    # Additional context (for complex operations)
    additional_data = models.JSONField(default=dict, null=True, blank=True)
    
    report_name = models.CharField(
        max_length=200, null=True, blank=True,
        help_text="Name of the report for VIEW_REPORT_* / EXPORT_REPORT_* actions"
    )
    description = models.TextField(
        null=True, blank=True,
        help_text="Human-readable story built from all other fields"
    )

    class Meta:
        db_table = 'audit_log'
        # Composite indexes for common query patterns
        indexes = [
            models.Index(fields=['timestamp', 'user_email']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['entity_type', 'timestamp']),
            models.Index(fields=['success', 'timestamp']),
            # make the description field indexed for faster search
            models.Index(fields=['description'], name='idx_auditlog_description'),
        ]
        ordering = ['-timestamp']  # Most recent first
    
    def __str__(self):
        return f"{self.timestamp} - {self.username} - {self.action} - {self.endpoint}"

class AuditTranslation(models.Model):
    id = models.AutoField(primary_key=True)
    action = models.CharField(max_length=100, unique=True)
    hebrew_translation = models.CharField(max_length=255)
