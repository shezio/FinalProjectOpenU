from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from rest_framework import permissions
from django.db import models


class AutoTableNameModelBase(models.base.ModelBase):
    def __new__(cls, name, bases, attrs):
        # Create the new model class
        new_class = super().__new__(cls, name, bases, attrs)

        # Check if the Meta class exists
        meta = attrs.get("Meta", None)

        if meta is None or not hasattr(meta, "db_table"):
            # Define a new Meta class or modify the existing one
            if not meta:

                class Meta:
                    pass

                meta = Meta
                setattr(new_class, "Meta", meta)

            # Set the default db_table to the lowercase class name
            setattr(meta, "db_table", name.lower())

        return new_class


class AutoTableNameModel(models.Model, metaclass=AutoTableNameModelBase):
    class Meta:
        abstract = True


class TutorshipStatus(models.TextChoices):
    HAS_TUTEE = "HAS_TUTEE", "Has Tutee"
    NO_TUTEE = "NO_TUTEE", "No Tutee"
    NOT_AVAILABLE = "NOT_AVAILABLE", "Not Available for Assignment"


class Role(models.Model):
    role_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.role_name


class Permissions(AutoTableNameModel):
    permission_id = models.AutoField(primary_key=True)
    role = models.CharField(max_length=255)
    resource = models.CharField(max_length=255)
    action = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.role} - {self.resource} - {self.action}"


class StaffManager(BaseUserManager):
    def create_user(self, username, email, password=None):
        if not email:
            raise ValueError("Staff must have an email address")
        if not username:
            raise ValueError("Staff must have a username")

        user = self.model(
            email=self.normalize_email(email),
            username=username,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None):
        user = self.create_user(
            username=username,
            email=email,
            password=password,
        )
        user.is_admin = True
        user.save(using=self._db)
        return user


class Staff(AbstractBaseUser, AutoTableNameModel):
    staff_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StaffManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username


class SignedUp(AutoTableNameModel):
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


class General_Volunteer(AutoTableNameModel):
    id = models.OneToOneField(SignedUp, on_delete=models.CASCADE, primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    signupdate = models.DateField()
    comments = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"General Volunteer {self.id.first_name} {self.id.surname}"


class Pending_Tutor(AutoTableNameModel):
    pending_tutor_id = models.AutoField(primary_key=True)
    id = models.ForeignKey(SignedUp, on_delete=models.CASCADE)
    pending_status = models.CharField(max_length=255)

    def __str__(self):
        return f"Pending Tutor {self.id.first_name} {self.id.surname}"


class Tutors(AutoTableNameModel):
    id = models.OneToOneField(SignedUp, on_delete=models.CASCADE, primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    tutorship_status = models.CharField(max_length=255, choices=TutorshipStatus.choices)
    preferences = models.TextField(null=True, blank=True)
    tutor_email = models.EmailField(null=True, blank=True)
    relationship_status = models.CharField(max_length=255, null=True, blank=True)
    tutee_wellness = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"Tutor {self.id.first_name} {self.id.surname}"


class Children(AutoTableNameModel):
    child_id = models.AutoField(primary_key=True)
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


class Tutorships(AutoTableNameModel):
    id = models.AutoField(primary_key=True)
    child = models.ForeignKey(Children, on_delete=models.CASCADE)
    tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE)

    def __str__(self):
        return (
            f"Tutorship {self.id} - Child {self.child.child_id} - Tutor {self.tutor.id}"
        )


class Matures(AutoTableNameModel):
    timestamp = models.DateTimeField()
    child = models.OneToOneField(Children, on_delete=models.CASCADE, primary_key=True)
    full_address = models.CharField(max_length=255)
    current_medical_state = models.CharField(max_length=255, null=True, blank=True)
    when_completed_treatments = models.DateField(null=True, blank=True)
    parent_name = models.CharField(max_length=255)
    parent_phone = models.CharField(max_length=20)
    additional_info = models.TextField(null=True, blank=True)
    general_comment = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Mature {self.child.childfirstname} {self.child.childsurname}"


class Healthy(AutoTableNameModel):
    child = models.OneToOneField(Children, on_delete=models.CASCADE, primary_key=True)
    street_and_apartment_number = models.CharField(
        max_length=255, null=True, blank=True
    )
    father_name = models.CharField(max_length=255, null=True, blank=True)
    father_phone = models.CharField(max_length=20, null=True, blank=True)
    mother_name = models.CharField(max_length=255, null=True, blank=True)
    mother_phone = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"Healthy {self.child.childfirstname} {self.child.childsurname}"


class Feedback(AutoTableNameModel):
    feedback_id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    event_date = models.DateTimeField()
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    description = models.TextField()
    exceptional_events = models.TextField(null=True, blank=True)
    anything_else = models.TextField(null=True, blank=True)
    comments = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Feedback {self.feedback_id} by {self.staff.username}"


class Tutor_Feedback(AutoTableNameModel):
    feedback = models.OneToOneField(
        Feedback, on_delete=models.CASCADE, primary_key=True
    )
    tutee_name = models.CharField(max_length=255)
    tutor_name = models.CharField(max_length=255)
    tutor = models.ForeignKey(Tutors, on_delete=models.CASCADE)
    is_it_your_tutee = models.BooleanField()
    is_first_visit = models.BooleanField()

    def __str__(self):
        return f"Tutor Feedback {self.feedback.feedback_id} by {self.tutor_name}"


class General_V_Feedback(AutoTableNameModel):
    feedback = models.OneToOneField(
        Feedback, on_delete=models.CASCADE, primary_key=True
    )
    volunteer_name = models.CharField(max_length=255)
    volunteer = models.ForeignKey(General_Volunteer, on_delete=models.CASCADE)

    def __str__(self):
        return f"General Volunteer Feedback {self.feedback.feedback_id} by {self.volunteer_name}"


class HasPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        # Fetch user's role and permissions
        user_role = user.role.role_name
        resource = view.__class__.__name__
        action = request.method

        # Check if the user has the required permission
        return Permissions.objects.filter(
            role__role_name=user_role, resource=resource, action=action
        ).exists()


class TaskType(models.TextChoices):
    CANDIDATE_INTERVIEW = "Candidate Interview for Tutoring"
    ADD_TUTOR = "Adding a Tutor"
    MATCH_TUTEE = "Matching a Tutee"
    ADD_FAMILY = "Adding a Family"
    FAMILY_STATUS_CHECK = "Family Status Check"
    FAMILY_UPDATE = "Family Update"
    FAMILY_DELETION = "Family Deletion"
    ADD_HEALTHY_MEMBER = "Adding a Healthy Member"
    REVIEW_MATURE = "Reviewing a Mature Individual"
    TUTORING = "Tutoring"
    TUTORING_FEEDBACK = "Tutoring Feedback"
    REVIEW_TUTOR_FEEDBACK = "Reviewing Tutor Feedback"
    GENERAL_VOLUNTEER_FEEDBACK = "General Volunteer Feedback"
    REVIEW_GENERAL_VOLUNTEER_FEEDBACK = "Reviewing General Volunteer Feedback"
    FEEDBACK_REPORT_GENERATION = "Feedback Report Generation"


class Tasks(AutoTableNameModel):
    task_id = models.AutoField(primary_key=True)
    staff_member = models.ForeignKey(Staff, on_delete=models.CASCADE)
    task_description = models.TextField()
    due_date = models.DateField()
    status = models.CharField(max_length=255, default="Pending")
    task_type = models.ForeignKey(TaskType, on_delete=models.CASCADE)

    def __str__(self):
        return f"Task {self.task_id} - {self.task_type}"
