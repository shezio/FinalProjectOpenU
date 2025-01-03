from django.db import models
from .tutors_models import Tutor
from .family_models import FamilyMember

class TutorshipStatus(models.TextChoices):
    HAS_TUTEE = 'HAS_TUTEE', 'Has Tutee'
    NO_TUTEE = 'NO_TUTEE', 'No Tutee'
    NOT_AVAILABLE = 'NOT_AVAILABLE', 'Not Available for Assignment'

class Tutorship(models.Model):
    tutorship_id = models.AutoField(primary_key=True)
    family_member = models.ForeignKey(FamilyMember, on_delete=models.CASCADE)
    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=TutorshipStatus.choices,
        default=TutorshipStatus.NO_TUTEE
    )
    geographic_proximity = models.FloatField(null=True, blank=True)  # Distance in kilometers
    gender_match = models.BooleanField(default=False)

    def __str__(self):
        return f"Tutorship {self.tutorship_id} - Family Member {self.family_member.member_id} - Tutor {self.tutor.id}"