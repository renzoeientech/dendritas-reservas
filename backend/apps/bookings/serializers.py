from django.utils import timezone
from rest_framework import serializers

from apps.rooms.models import RoomSchedule
from apps.users.models import User
from apps.users.serializers import CompanySerializer

from .models import Booking


class BookingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "first_name", "last_name")
        read_only_fields = fields


class BookingSerializer(serializers.ModelSerializer):
    user = BookingUserSerializer(read_only=True)
    company = CompanySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "room",
            "user",
            "company",
            "title",
            "start_time",
            "end_time",
            "status",
            "created_at",
            "cancelled_at",
        )
        read_only_fields = ("id", "user", "company", "status", "created_at", "cancelled_at")

    def validate(self, attrs):
        start, end = attrs["start_time"], attrs["end_time"]

        if start >= end:
            raise serializers.ValidationError("start_time debe ser menor que end_time.")

        for field_name, value in (("start_time", start), ("end_time", end)):
            if value.minute % 5 != 0 or value.second != 0 or value.microsecond != 0:
                raise serializers.ValidationError(
                    {field_name: "Debe estar alineado a múltiplos de 5 minutos."}
                )

        local_start = timezone.localtime(start)
        local_end = timezone.localtime(end)
        if local_start.date() != local_end.date():
            raise serializers.ValidationError("La reserva debe empezar y terminar el mismo día.")

        room = attrs["room"]
        fits_schedule = RoomSchedule.objects.filter(
            room=room,
            weekday=local_start.weekday(),
            start_time__lte=local_start.time(),
            end_time__gte=local_end.time(),
        ).exists()
        if not fits_schedule:
            raise serializers.ValidationError(
                "La reserva está fuera del horario habilitado para la sala en ese día."
            )

        return attrs


class BookingRedactedSerializer(serializers.ModelSerializer):
    """Used when the viewer isn't privileged for this booking: title and user hidden, company stays visible."""

    company = CompanySerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ("id", "room", "company", "start_time", "end_time", "status")
        read_only_fields = fields
