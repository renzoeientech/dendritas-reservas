from rest_framework import serializers

from .models import Room, RoomSchedule


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ("id", "name", "capacity", "location", "color", "is_active")
        read_only_fields = ("id",)


class RoomScheduleSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = RoomSchedule
        fields = ("id", "weekday", "weekday_display", "start_time", "end_time")
        read_only_fields = ("id",)

    def validate(self, attrs):
        start, end = attrs.get("start_time"), attrs.get("end_time")
        if start is not None and end is not None and start >= end:
            raise serializers.ValidationError("start_time debe ser menor que end_time.")
        return attrs
