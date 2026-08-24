import threading
from datetime import datetime

from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.companies.models import Company
from apps.rooms.models import Room, RoomSchedule
from apps.users.models import User

from .models import Booking, BookingStatus


def _dt(hour, minute):
    return timezone.make_aware(datetime(2024, 1, 1, hour, minute))  # 2024-01-01 is a Monday


class BookingApiTests(APITestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.member_a = User.objects.create_user(
            email="member_a@a.com", password="pass1234", company=self.company_a, role="member"
        )
        self.member_a2 = User.objects.create_user(
            email="member_a2@a.com", password="pass1234", company=self.company_a, role="member"
        )
        self.admin_a = User.objects.create_user(
            email="admin_a@a.com", password="pass1234", company=self.company_a, role="admin"
        )
        self.member_b = User.objects.create_user(
            email="member_b@b.com", password="pass1234", company=self.company_b, role="member"
        )
        self.admin_b = User.objects.create_user(
            email="admin_b@b.com", password="pass1234", company=self.company_b, role="admin"
        )
        self.superadmin = User.objects.create_user(
            email="super@dendritas.com", password="pass1234", role="superadmin"
        )

        self.room = Room.objects.create(
            name="Neuritas", capacity=8, location="Piso 2", color="#FF0000"
        )
        RoomSchedule.objects.create(
            room=self.room, weekday=0, start_time="08:00:00", end_time="12:00:00"
        )
        RoomSchedule.objects.create(
            room=self.room, weekday=0, start_time="13:00:00", end_time="18:00:00"
        )

    def _create_booking(self, user, start, end, title="Reunión"):
        client = APIClient()
        client.force_authenticate(user)
        return client.post(
            "/api/bookings/",
            {
                "room": self.room.id,
                "title": title,
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
            },
            format="json",
        )

    def test_valid_booking_succeeds(self):
        response = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Booking.objects.count(), 1)
        self.assertEqual(Booking.objects.first().status, BookingStatus.CONFIRMED)

    def test_overlapping_booking_different_company_fails(self):
        first = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        self.assertEqual(first.status_code, 201)
        second = self._create_booking(self.member_b, _dt(9, 30), _dt(10, 30))
        self.assertEqual(second.status_code, 400)
        self.assertEqual(Booking.objects.filter(status=BookingStatus.CONFIRMED).count(), 1)

    def test_booking_outside_schedule_fails(self):
        response = self._create_booking(self.member_a, _dt(6, 0), _dt(7, 0))
        self.assertEqual(response.status_code, 400)

    def test_booking_minutes_not_multiple_of_5_fails(self):
        response = self._create_booking(self.member_a, _dt(9, 0), _dt(9, 7))
        self.assertEqual(response.status_code, 400)

    def test_other_company_cannot_see_title(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0), title="Secreto A")
        self.assertEqual(create.status_code, 201)

        client_b = APIClient()
        client_b.force_authenticate(self.member_b)
        response = client_b.get(f"/api/bookings/?room={self.room.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        entry = response.data[0]
        self.assertNotIn("title", entry)
        self.assertNotIn("user", entry)
        self.assertEqual(entry["company"]["id"], self.company_a.id)

        client_a = APIClient()
        client_a.force_authenticate(self.member_a)
        response_a = client_a.get(f"/api/bookings/?room={self.room.id}")
        self.assertEqual(response_a.data[0]["title"], "Secreto A")

    def test_schedule_gap_straddle_fails(self):
        response = self._create_booking(self.member_a, _dt(11, 30), _dt(13, 30))
        self.assertEqual(response.status_code, 400)

    def test_companyless_superadmin_cannot_create_booking(self):
        response = self._create_booking(self.superadmin, _dt(9, 0), _dt(10, 0))
        self.assertEqual(response.status_code, 400)

    def test_owner_can_cancel_own_booking(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.member_a)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], BookingStatus.CANCELLED)
        booking = Booking.objects.get(id=booking_id)
        self.assertIsNotNone(booking.cancelled_at)

    def test_member_same_company_cannot_cancel_others_booking(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.member_a2)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 403)

    def test_member_different_company_cannot_cancel(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.member_b)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 403)

    def test_admin_can_cancel_booking_from_own_company(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.admin_a)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 200)

    def test_admin_cannot_cancel_booking_from_different_company(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.admin_b)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 403)

    def test_superadmin_can_cancel_any_booking(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.superadmin)
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 200)

    def test_cancel_already_cancelled_booking_fails(self):
        create = self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        booking_id = create.data["id"]
        client = APIClient()
        client.force_authenticate(self.member_a)
        client.delete(f"/api/bookings/{booking_id}/")
        response = client.delete(f"/api/bookings/{booking_id}/")
        self.assertEqual(response.status_code, 400)

    def test_anonymous_cannot_list_or_create(self):
        client = APIClient()
        self.assertEqual(client.get("/api/bookings/").status_code, 401)
        self.assertEqual(
            client.post(
                "/api/bookings/",
                {
                    "room": self.room.id,
                    "title": "x",
                    "start_time": _dt(9, 0).isoformat(),
                    "end_time": _dt(10, 0).isoformat(),
                },
                format="json",
            ).status_code,
            401,
        )

    def test_list_filters_by_room_and_date_range(self):
        self._create_booking(self.member_a, _dt(9, 0), _dt(10, 0))
        Room.objects.create(name="Comedor", capacity=20, location="PB", color="#00FF00")
        self._create_booking(self.member_a, _dt(13, 0), _dt(14, 0))
        client = APIClient()
        client.force_authenticate(self.member_a)

        response = client.get(f"/api/bookings/?room={self.room.id}")
        self.assertEqual(len(response.data), 2)

        response = client.get("/api/bookings/?from=2024-01-01T12:00:00&to=2024-01-01T23:59:59")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["start_time"][11:16], "13:00")


class BookingConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")
        self.member_a = User.objects.create_user(
            email="member_a@a.com", password="pass1234", company=self.company_a, role="member"
        )
        self.member_b = User.objects.create_user(
            email="member_b@b.com", password="pass1234", company=self.company_b, role="member"
        )
        self.room = Room.objects.create(
            name="Neuritas", capacity=8, location="Piso 2", color="#FF0000"
        )
        RoomSchedule.objects.create(
            room=self.room, weekday=0, start_time="08:00:00", end_time="18:00:00"
        )

    def test_concurrent_bookings_for_same_slot_only_one_succeeds(self):
        barrier = threading.Barrier(2)
        results = {}

        def attempt(user, key):
            try:
                barrier.wait(timeout=5)
                client = APIClient()
                client.force_authenticate(user)
                response = client.post(
                    "/api/bookings/",
                    {
                        "room": self.room.id,
                        "title": f"Reunión {key}",
                        "start_time": _dt(9, 0).isoformat(),
                        "end_time": _dt(10, 0).isoformat(),
                    },
                    format="json",
                )
                results[key] = response.status_code
            finally:
                connection.close()

        t1 = threading.Thread(target=attempt, args=(self.member_a, "a"))
        t2 = threading.Thread(target=attempt, args=(self.member_b, "b"))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        status_codes = sorted(results.values())
        self.assertEqual(status_codes, [201, 400])
        self.assertEqual(Booking.objects.filter(status=BookingStatus.CONFIRMED).count(), 1)
