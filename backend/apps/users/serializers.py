from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.companies.models import Company

from .models import Role, User


class CompanySerializer(serializers.ModelSerializer):
    admins = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ("id", "name", "slug", "created_at", "admins")
        read_only_fields = fields

    def get_admins(self, obj):
        admins = obj.users.filter(role=Role.ADMIN, is_active=True).order_by("id")
        return [
            {
                "id": admin.id,
                "email": admin.email,
                "first_name": admin.first_name,
                "last_name": admin.last_name,
            }
            for admin in admins
        ]


class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "company", "is_active")
        read_only_fields = fields


class CompanyUserCreateSerializer(serializers.Serializer):
    """Crea un usuario miembro (role=member) dentro de la empresa del admin autenticado."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese email.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            company=request.user.company,
            role=Role.MEMBER,
        )
