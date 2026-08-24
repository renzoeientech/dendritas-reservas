from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from apps.companies.models import Company

from .models import Role, User


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ("id", "name", "slug", "created_at")
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "company", "is_active")
        read_only_fields = fields


class RegisterCompanySerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_company_name(self, value):
        if Company.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una empresa con ese nombre.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        company = Company.objects.create(name=validated_data["company_name"])
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            company=company,
            role=Role.ADMIN,
        )
        return user
