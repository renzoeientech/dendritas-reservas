from django.db import models


class BookingStatus(models.TextChoices):
    CONFIRMED = "confirmed", "Confirmada"
    CANCELLED = "cancelled", "Cancelada"


class Booking(models.Model):
    room = models.ForeignKey("rooms.Room", on_delete=models.PROTECT, related_name="bookings")
    user = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="bookings")
    company = models.ForeignKey("companies.Company", on_delete=models.PROTECT, related_name="bookings")
    title = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.CONFIRMED)
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["room", "start_time", "end_time"]),
            models.Index(fields=["room", "status"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["user"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_time__lt=models.F("end_time")),
                name="booking_start_before_end",
            )
        ]

    def __str__(self):
        return f"{self.room.name} - {self.title} ({self.start_time})"
