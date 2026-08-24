from rest_framework.permissions import BasePermission

from apps.users.models import Role


def is_privileged_for_booking(user, booking):
    """True if user can see full booking details / cancel it:
    the booking's owner, an admin of the booking's company, or a superadmin."""
    if booking.user_id == user.id:
        return True
    if user.role == Role.ADMIN and user.company_id == booking.company_id:
        return True
    if user.role == Role.SUPERADMIN:
        return True
    return False


class CanCancelBooking(BasePermission):
    def has_object_permission(self, request, view, booking):
        return is_privileged_for_booking(request.user, booking)
