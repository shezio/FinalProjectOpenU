from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class Permissions(models.Model):
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

class Staff(AbstractBaseUser):
    staff_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=255, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    role = models.ForeignKey(Permissions, on_delete=models.CASCADE)
    firstname = models.CharField(max_length=255)
    lastname = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StaffManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username