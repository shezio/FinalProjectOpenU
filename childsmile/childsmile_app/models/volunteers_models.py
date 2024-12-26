# models/volunteers_models.py

from django.db import models

class Volunteer(models.Model):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    active = models.BooleanField(default=True)
    departed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"