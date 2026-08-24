from django.contrib import admin

from .models import Room, RoomSchedule


class RoomScheduleInline(admin.TabularInline):
    model = RoomSchedule
    extra = 1


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "capacity", "location", "color", "is_active")
    list_filter = ("is_active",)
    inlines = [RoomScheduleInline]


@admin.register(RoomSchedule)
class RoomScheduleAdmin(admin.ModelAdmin):
    list_display = ("room", "weekday", "start_time", "end_time")
    list_filter = ("room", "weekday")
