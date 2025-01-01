from django.db import models

class Family(models.Model):
    family_id = models.AutoField(primary_key=True)
    family_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.family_name

class FamilyMember(models.Model):
    member_id = models.AutoField(primary_key=True)
    family = models.ForeignKey(Family, on_delete=models.CASCADE, related_name='members')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10)
    relationship_to_family = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    additional_info = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"