from django.db import models
from .staff_models import Staff
from .family_models import Family, FamilyMember
from .tutors_models import Tutor

class TaskType(models.TextChoices):
    CANDIDATE_INTERVIEW = 'Candidate Interview for Tutoring'
    ADD_TUTOR = 'Adding a Tutor'
    MATCH_TUTEE = 'Matching a Tutee'
    ADD_FAMILY = 'Adding a Family'
    FAMILY_STATUS_CHECK = 'Family Status Check'
    FAMILY_UPDATE = 'Family Update'
    FAMILY_DELETION = 'Family Deletion'
    ADD_HEALTHY_MEMBER = 'Adding a Healthy Member'
    REVIEW_MATURE = 'Reviewing a Mature Individual'
    TUTORING = 'Tutoring'
    TUTORING_FEEDBACK = 'Tutoring Feedback'
    REVIEW_TUTOR_FEEDBACK = 'Reviewing Tutor Feedback'
    GENERAL_VOLUNTEER_FEEDBACK = 'General Volunteer Feedback'
    REVIEW_GENERAL_VOLUNTEER_FEEDBACK = 'Reviewing General Volunteer Feedback'
    FEEDBACK_REPORT_GENERATION = 'Feedback Report Generation'

class Task(models.Model):
    task_id = models.AutoField(primary_key=True)
    task_type = models.CharField(max_length=255, choices=TaskType.choices)
    description = models.TextField()
    assigned_to = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='tasks')
    related_family = models.ForeignKey(Family, on_delete=models.CASCADE, null=True, blank=True)
    related_tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE, null=True, blank=True)
    related_child = models.ForeignKey(FamilyMember, on_delete=models.CASCADE, null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=255, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Task {self.task_id} - {self.task_type}"