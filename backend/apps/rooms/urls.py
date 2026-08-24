from django.urls import path

from .views import RoomDetailView, RoomListCreateView, RoomScheduleView

urlpatterns = [
    path("", RoomListCreateView.as_view(), name="room-list-create"),
    path("<int:pk>/", RoomDetailView.as_view(), name="room-detail"),
    path("<int:pk>/schedule/", RoomScheduleView.as_view(), name="room-schedule"),
]
