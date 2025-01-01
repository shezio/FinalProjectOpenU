from django.db import models
from .family_models import Family

class HealthyKid(models.Model):
    healthy_kid_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='healthy_kids')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        return date.today().year - self.date_of_birth.year - ((date.today().month, date.today().day) < (self.date_of_birth.month, self.date_of_birth.day))