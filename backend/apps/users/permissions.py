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


class IsCompanyAdmin(BasePermission):
    """Allows access only to authenticated users with role=admin, scoped to their own company."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.ADMIN
            and request.user.company_id is not None
        )
