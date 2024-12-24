from django.db import models
from .tutors_models import Tutor
from .children_models import Children

class Tutorship(models.Model):
    id = models.AutoField(primary_key=True)
    child = models.ForeignKey(Children, on_delete=models.CASCADE)
    tutor = models.ForeignKey(Tutor, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=255)

    def __str__(self):
        return f"Tutorship {self.id} - Child {self.child.child_id} - Tutor {self.tutor.id}"