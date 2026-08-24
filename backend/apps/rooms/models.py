from django.contrib.postgres.fields import ArrayField
from django.core.validators import RegexValidator
from django.db import models


class Amenity(models.TextChoices):
    TV = "tv", "TV"
    PIZARRA = "pizarra", "Pizarra"
    PROYECTOR = "proyector", "Proyector"
    WIFI = "wifi", "Wifi"
    AIRE_ACONDICIONADO = "aire_acondicionado", "Aire acondicionado"
    CAFETERA = "cafetera", "Cafetera"


class Room(models.Model):
    name = models.CharField(max_length=100, unique=True)
    capacity = models.PositiveIntegerField()
    location = models.CharField(max_length=255, blank=True)
    color = models.CharField(
        max_length=7,
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Debe ser un color hex, ej: #1E90FF")],
    )
    amenities = ArrayField(
        models.CharField(max_length=30, choices=Amenity.choices),
        default=list,
        blank=True,
    )
    photo = models.ImageField(upload_to="rooms/", null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Weekday(models.IntegerChoices):
    MONDAY = 0, "Lunes"
    TUESDAY = 1, "Martes"
    WEDNESDAY = 2, "Miércoles"
    THURSDAY = 3, "Jueves"
    FRIDAY = 4, "Viernes"
    SATURDAY = 5, "Sábado"
    SUNDAY = 6, "Domingo"


class RoomSchedule(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="schedules")
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        indexes = [models.Index(fields=["room", "weekday"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(start_time__lt=models.F("end_time")),
                name="roomschedule_start_before_end",
            )
        ]

    def __str__(self):
        return f"{self.room.name} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"
