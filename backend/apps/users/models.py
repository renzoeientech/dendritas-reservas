from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class Role(models.TextChoices):
    SUPERADMIN = "superadmin", "Superadmin"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Miembro"


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        indexes = [models.Index(fields=["company", "role"])]

    def __str__(self):
        return self.email
