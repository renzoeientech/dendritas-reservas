import datetime

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response

from apps.rooms.models import Room

from .models import Booking, BookingStatus
from .permissions import CanCancelBooking, is_privileged_for_booking
from .serializers import BookingRedactedSerializer, BookingSerializer


def _parse_boundary(value, end_of_day=False):
    dt = parse_datetime(value)
    if dt is not None:
        return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
    d = parse_date(value)
    if d is not None:
        t = datetime.time.max if end_of_day else datetime.time.min
        return timezone.make_aware(datetime.datetime.combine(d, t))
    raise serializers.ValidationError({"detail": f"Fecha inválida: {value}"})


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Booking.objects.select_related("room", "user", "company").order_by("start_time")
        room_id = self.request.query_params.get("room")
        if room_id:
            qs = qs.filter(room_id=room_id)
        from_param = self.request.query_params.get("from")
        to_param = self.request.query_params.get("to")
        if from_param:
            qs = qs.filter(end_time__gt=_parse_boundary(from_param))
        if to_param:
            qs = qs.filter(start_time__lt=_parse_boundary(to_param, end_of_day=True))
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        results = []
        for booking in queryset:
            if is_privileged_for_booking(request.user, booking):
                results.append(BookingSerializer(booking).data)
            elif booking.status == BookingStatus.CONFIRMED:
                results.append(BookingRedactedSerializer(booking).data)
            # cancelled + not privileged -> omitted entirely
        return Response(results)

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        if user.company_id is None:
            raise serializers.ValidationError(
                {"company": "Tu usuario no pertenece a ninguna empresa; no podés crear reservas."}
            )

        room = Room.objects.select_for_update().get(pk=serializer.validated_data["room"].pk)
        start, end = serializer.validated_data["start_time"], serializer.validated_data["end_time"]

        overlap = Booking.objects.filter(
            room=room,
            status=BookingStatus.CONFIRMED,
            start_time__lt=end,
            end_time__gt=start,
        ).exists()
        if overlap:
            raise serializers.ValidationError(
                {"detail": "Ya existe una reserva confirmada que se superpone con ese horario en esta sala."}
            )

        serializer.save(user=user, company=user.company)


class BookingDetailView(generics.DestroyAPIView):
    queryset = Booking.objects.select_related("room", "user", "company")
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, CanCancelBooking]

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if booking.status == BookingStatus.CANCELLED:
            return Response(
                {"detail": "La reserva ya está cancelada."}, status=status.HTTP_400_BAD_REQUEST
            )
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=["status", "cancelled_at"])
        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)
