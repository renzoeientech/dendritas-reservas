from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from apps.users.models import Role, User

from .models import Company


class CompanyCreateSerializer(serializers.Serializer):
    """Crea una empresa y designa su usuario admin (role=admin). Solo para superadmin."""

    name = serializers.CharField(max_length=255)
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, validators=[validate_password])
    admin_first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    admin_last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_name(self, value):
        if Company.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una empresa con ese nombre.")
        return value

    def validate_admin_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        company = Company.objects.create(name=validated_data["name"])
        User.objects.create_user(
            email=validated_data["admin_email"],
            password=validated_data["admin_password"],
            first_name=validated_data.get("admin_first_name", ""),
            last_name=validated_data.get("admin_last_name", ""),
            company=company,
            role=Role.ADMIN,
        )
        return company


class CompanyAdminAssignSerializer(serializers.Serializer):
    """Designa el admin de una empresa que no tiene uno activo. Solo para superadmin.

    Si el email pertenece a un usuario desactivado (p. ej. un admin eliminado
    antes), reutiliza esa cuenta en vez de bloquear por email duplicado.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        existing = User.objects.filter(email__iexact=value).first()
        if existing is not None and existing.is_active:
            raise serializers.ValidationError("Ya existe un usuario activo con ese email.")
        return value

    def create(self, validated_data):
        company = self.context["company"]
        existing = User.objects.filter(email__iexact=validated_data["email"]).first()
        if existing is not None:
            existing.company = company
            existing.role = Role.ADMIN
            existing.is_active = True
            existing.first_name = validated_data.get("first_name", "")
            existing.last_name = validated_data.get("last_name", "")
            existing.set_password(validated_data["password"])
            existing.save()
            return existing
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            company=company,
            role=Role.ADMIN,
        )
