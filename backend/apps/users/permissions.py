from rest_framework.permissions import BasePermission

from .models import Role


class IsSuperAdmin(BasePermission):
    """Allows access only to authenticated users with role=superadmin."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.SUPERADMIN
        )
