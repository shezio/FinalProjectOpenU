from django.db import models
from .staff_models import Staff

class TutorshipStatus(models.TextChoices):
    HAS_TUTEE = 'יש_חניך', 'Has Tutee'
    NO_TUTEE = 'אין_חניך', 'No Tutee'
    NOT_AVAILABLE = 'לא_זמין_לשיבוץ', 'Not Available for Assignment'

class Tutor(models.Model):
    id = models.AutoField(primary_key=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    tutorship_status = models.CharField(max_length=20, choices=TutorshipStatus.choices)
    preferences = models.TextField(null=True, blank=True)
    tutor_email = models.EmailField(max_length=255, null=True, blank=True)
    relationship_status = models.CharField(max_length=255, null=True, blank=True)
    tutee_wellness = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Tutor {self.id} - {self.staff.username}"