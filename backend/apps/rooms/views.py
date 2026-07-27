from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsSuperAdmin

from .models import Room
from .serializers import RoomScheduleSerializer, RoomSerializer


class RoomListCreateView(generics.ListCreateAPIView):
    queryset = Room.objects.all().order_by("name")
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdmin()]

    def destroy(self, request, *args, **kwargs):
        room = self.get_object()
        room.is_active = False
        room.save(update_fields=["is_active"])
        return Response(self.get_serializer(room).data, status=status.HTTP_200_OK)


class RoomScheduleView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSuperAdmin()]

    def get(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        schedules = room.schedules.order_by("weekday", "start_time")
        return Response(RoomScheduleSerializer(schedules, many=True).data)

    @transaction.atomic
    def put(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        serializer = RoomScheduleSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        room.schedules.all().delete()
        serializer.save(room=room)
        return Response(serializer.data, status=status.HTTP_200_OK)
