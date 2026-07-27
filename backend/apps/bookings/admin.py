from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("room", "user", "company", "title", "start_time", "end_time", "status")
    list_filter = ("status", "company", "room")
    search_fields = ("title", "user__email")
    readonly_fields = ("created_at",)
    date_hierarchy = "start_time"
