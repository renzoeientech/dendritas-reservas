from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/rooms/", include("apps.rooms.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
]
