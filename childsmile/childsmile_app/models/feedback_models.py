from django.db import models
from .staff_models import Staff
from .tutors_models import Tutor
from .volunteers_models import Volunteer

class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    event_date = models.DateTimeField()
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    description = models.TextField()
    exceptional_events = models.TextField(null=True, blank=True)
    anything_else = models.TextField(null=True, blank=True)
    comments = models.TextField(null=True, blank=True)
    reviewed = models.BooleanField(default=False)

    def __str__(self):
        return f"Feedback {self.feedback_id} by {self.staff.username}"

class TutorFeedback(models.Model):
    feedback = models.OneToOneField(Feedback, on_delete=models.CASCADE, primary_key=True)
    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE)
    tutee_name = models.CharField(max_length=255)
    is_it_your_tutee = models.BooleanField()
    is_first_visit = models.BooleanField()

    def __str__(self):
        return f"Mentor Feedback {self.feedback.feedback_id} by {self.tutor.staff.username}"

class VolunteerFeedback(models.Model):
    feedback = models.OneToOneField(Feedback, on_delete=models.CASCADE, primary_key=True)
    volunteer = models.ForeignKey(Volunteer, on_delete=models.CASCADE)
    volunteer_name = models.CharField(max_length=255)

    def __str__(self):
        return f"Volunteer Feedback {self.feedback.feedback_id} by {self.volunteer.staff.username}"