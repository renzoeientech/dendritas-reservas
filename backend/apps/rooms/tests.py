from rest_framework.test import APITestCase

from apps.companies.models import Company
from apps.users.models import User

from .models import Room, RoomSchedule


class RoomApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Acme Corp")
        self.member = User.objects.create_user(
            email="member@acme.com", password="pass1234", company=self.company, role="member"
        )
        self.superadmin = User.objects.create_user(
            email="super@dendritas.com", password="pass1234", role="superadmin"
        )
        self.room = Room.objects.create(
            name="Neuritas", capacity=8, location="Piso 2", color="#FF0000"
        )

    def test_anonymous_list_is_unauthorized(self):
        response = self.client.get("/api/rooms/")
        self.assertEqual(response.status_code, 401)

    def test_member_can_list_rooms(self):
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/rooms/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_member_cannot_create_room(self):
        self.client.force_authenticate(self.member)
        response = self.client.post(
            "/api/rooms/",
            {"name": "Comedor", "capacity": 20, "location": "PB", "color": "#00FF00"},
        )
        self.assertEqual(response.status_code, 403)

    def test_superadmin_can_create_room(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.post(
            "/api/rooms/",
            {"name": "Comedor", "capacity": 20, "location": "PB", "color": "#00FF00"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Room.objects.count(), 2)

    def test_superadmin_can_patch_room(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.patch(f"/api/rooms/{self.room.id}/", {"capacity": 10})
        self.assertEqual(response.status_code, 200)
        self.room.refresh_from_db()
        self.assertEqual(self.room.capacity, 10)

    def test_delete_deactivates_instead_of_deleting(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.delete(f"/api/rooms/{self.room.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_active"])
        self.room.refresh_from_db()
        self.assertFalse(self.room.is_active)
        self.assertTrue(Room.objects.filter(id=self.room.id).exists())

    def test_schedule_get_is_public_to_authenticated_users(self):
        self.client.force_authenticate(self.member)
        response = self.client.get(f"/api/rooms/{self.room.id}/schedule/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_member_cannot_put_schedule(self):
        self.client.force_authenticate(self.member)
        response = self.client.put(f"/api/rooms/{self.room.id}/schedule/", [], format="json")
        self.assertEqual(response.status_code, 403)

    def test_schedule_put_replaces_existing_entries(self):
        self.client.force_authenticate(self.superadmin)
        first = self.client.put(
            f"/api/rooms/{self.room.id}/schedule/",
            [
                {"weekday": 0, "start_time": "08:00:00", "end_time": "12:00:00"},
                {"weekday": 0, "start_time": "13:00:00", "end_time": "18:00:00"},
            ],
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(RoomSchedule.objects.filter(room=self.room).count(), 2)

        second = self.client.put(
            f"/api/rooms/{self.room.id}/schedule/",
            [{"weekday": 2, "start_time": "10:00:00", "end_time": "15:00:00"}],
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual(RoomSchedule.objects.filter(room=self.room).count(), 1)

    def test_schedule_put_rejects_invalid_time_range(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.put(
            f"/api/rooms/{self.room.id}/schedule/",
            [{"weekday": 3, "start_time": "18:00:00", "end_time": "09:00:00"}],
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(RoomSchedule.objects.filter(room=self.room).count(), 0)
