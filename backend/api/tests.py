from datetime import date, timedelta
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Hotel, Room, Reservation, Review

class HotelReservationApiTests(APITestCase):
    def setUp(self):
        # Throttle counters live in the shared cache; reset them between tests.
        cache.clear()

        # Create regular user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='Password123!',
            first_name='Test',
            last_name='User'
        )

        # Create admin user
        self.admin = User.objects.create_superuser(
            username='adminuser',
            email='admin@example.com',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='User'
        )

        # Create another regular user
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='Password123!'
        )

        # Create sample hotel
        self.hotel = Hotel.objects.create(
            name='Seaside Paradise Hotel',
            description='A beachfront hotel with stunning views.',
            address='10 Ocean Drive',
            city='Miami',
            country='USA',
            star_rating=5,
            amenities=['WiFi', 'Pool', 'Breakfast'],
            is_featured=True
        )

        # Create sample room
        self.room = Room.objects.create(
            hotel=self.hotel,
            room_number='101',
            room_type='double',
            price_per_night=150.00,
            capacity=2,
            bed_type='King Bed',
            size_sqm=40,
            is_available=True
        )

    def get_jwt_header(self, user):
        from api.authentication import generate_tokens_for_user
        tokens = generate_tokens_for_user(user)
        return {'HTTP_AUTHORIZATION': f"Bearer {tokens['access']}"}

    # 1. Authentication & Security Tests
    def test_user_registration(self):
        payload = {
            'username': 'newguest',
            'email': 'newguest@example.com',
            'first_name': 'New',
            'last_name': 'Guest',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!'
        }
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'newguest')

    def test_registration_password_mismatch(self):
        payload = {
            'username': 'mismatch',
            'email': 'mismatch@example.com',
            'password': 'Password123!',
            'confirm_password': 'DifferentPassword!'
        }
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success(self):
        payload = {
            'username': 'testuser',
            'password': 'Password123!'
        }
        response = self.client.post('/api/auth/login/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_user_login_invalid_password(self):
        payload = {
            'username': 'testuser',
            'password': 'WrongPassword!'
        }
        response = self.client.post('/api/auth/login/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_is_throttled_after_repeated_failures(self):
        payload = {'username': 'testuser', 'password': 'WrongPassword!'}
        # The login scope allows 5 requests per minute per IP / per account.
        for _ in range(5):
            response = self.client.post('/api/auth/login/', payload)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post('/api/auth/login/', payload)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        # Even the correct password is rejected while the limiter is active.
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'testuser', 'password': 'Password123!'},
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_login_throttle_is_per_account(self):
        # Exhaust the limit for one account, then confirm another account is
        # still served from the same IP (the per-IP counter still applies, so
        # use a distinct client IP to isolate the per-account behaviour).
        for _ in range(5):
            self.client.post(
                '/api/auth/login/',
                {'username': 'testuser', 'password': 'WrongPassword!'},
                REMOTE_ADDR='10.0.0.1',
            )

        response = self.client.post(
            '/api/auth/login/',
            {'username': 'otheruser', 'password': 'Password123!'},
            REMOTE_ADDR='10.0.0.2',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_registration_is_throttled(self):
        for index in range(5):
            payload = {
                'username': f'throttled{index}',
                'email': f'throttled{index}@example.com',
                'password': 'SecurePassword123!',
                'confirm_password': 'SecurePassword123!',
            }
            response = self.client.post('/api/auth/register/', payload)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post('/api/auth/register/', {
            'username': 'throttled_overflow',
            'email': 'throttled_overflow@example.com',
            'password': 'SecurePassword123!',
            'confirm_password': 'SecurePassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_user_profile_authenticated(self):
        headers = self.get_jwt_header(self.user)
        response = self.client.get('/api/auth/profile/', **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')

    def test_user_profile_unauthenticated(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 2. Hotel Authorization & CRUD Tests
    def test_list_hotels_anonymous(self):
        response = self.client.get('/api/hotels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)

    def test_create_hotel_non_admin_forbidden(self):
        headers = self.get_jwt_header(self.user)
        payload = {
            'name': 'Unauthorized Hotel',
            'description': 'Description',
            'address': 'Street 1',
            'city': 'Miami',
            'country': 'USA',
            'star_rating': 4
        }
        response = self.client.post('/api/hotels/', payload, **headers)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_hotel_admin_success(self):
        headers = self.get_jwt_header(self.admin)
        payload = {
            'name': 'Authorized Luxury Hotel',
            'description': 'Five star sanctuary',
            'address': '45 Avenue Foch',
            'city': 'Paris',
            'country': 'France',
            'star_rating': 5,
            'amenities': ['WiFi', 'Pool'],
            'is_featured': True
        }
        response = self.client.post('/api/hotels/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Authorized Luxury Hotel')

    # 3. Room Management Tests
    def test_create_room_admin(self):
        headers = self.get_jwt_header(self.admin)
        payload = {
            'hotel': self.hotel.id,
            'room_number': '102',
            'room_type': 'suite',
            'price_per_night': 300.00,
            'capacity': 3,
            'bed_type': 'King Bed',
            'size_sqm': 55,
            'is_available': True
        }
        response = self.client.post('/api/rooms/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['room_number'], '102')

    # 4. Reservation Logic & Validation Tests
    def test_create_reservation_success(self):
        headers = self.get_jwt_header(self.user)
        check_in = date.today() + timedelta(days=5)
        check_out = date.today() + timedelta(days=8)
        payload = {
            'room': self.room.id,
            'check_in': check_in.strftime('%Y-%m-%d'),
            'check_out': check_out.strftime('%Y-%m-%d'),
            'guests_count': 2,
            'special_requests': 'Quiet room please.'
        }
        response = self.client.post('/api/reservations/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(response.data['total_price']), 150.00 * 3) # 3 nights
        self.assertEqual(response.data['status'], 'confirmed')

    def test_reservation_invalid_dates_checkout_before_checkin(self):
        headers = self.get_jwt_header(self.user)
        check_in = date.today() + timedelta(days=5)
        check_out = date.today() + timedelta(days=3)
        payload = {
            'room': self.room.id,
            'check_in': check_in.strftime('%Y-%m-%d'),
            'check_out': check_out.strftime('%Y-%m-%d'),
            'guests_count': 1
        }
        response = self.client.post('/api/reservations/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reservation_capacity_exceeded(self):
        headers = self.get_jwt_header(self.user)
        check_in = date.today() + timedelta(days=5)
        check_out = date.today() + timedelta(days=7)
        payload = {
            'room': self.room.id,
            'check_in': check_in.strftime('%Y-%m-%d'),
            'check_out': check_out.strftime('%Y-%m-%d'),
            'guests_count': 10 # Room capacity is 2
        }
        response = self.client.post('/api/reservations/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reservation_double_booking_overlap_prevention(self):
        check_in = date.today() + timedelta(days=10)
        check_out = date.today() + timedelta(days=15)
        
        # First booking
        Reservation.objects.create(
            user=self.user,
            room=self.room,
            check_in=check_in,
            check_out=check_out,
            guests_count=2,
            total_price=750.00,
            status='confirmed'
        )

        # Overlapping booking attempt
        headers = self.get_jwt_header(self.other_user)
        payload = {
            'room': self.room.id,
            'check_in': (check_in + timedelta(days=2)).strftime('%Y-%m-%d'),
            'check_out': (check_out + timedelta(days=2)).strftime('%Y-%m-%d'),
            'guests_count': 1
        }
        response = self.client.post('/api/reservations/', payload, format='json', **headers)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('room', response.data)

    def test_cancel_own_reservation(self):
        check_in = date.today() + timedelta(days=12)
        check_out = date.today() + timedelta(days=14)
        reservation = Reservation.objects.create(
            user=self.user,
            room=self.room,
            check_in=check_in,
            check_out=check_out,
            guests_count=1,
            total_price=300.00,
            status='confirmed'
        )
        headers = self.get_jwt_header(self.user)
        response = self.client.post(f'/api/reservations/{reservation.id}/cancel/', **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'cancelled')

    def test_cannot_cancel_other_user_reservation(self):
        check_in = date.today() + timedelta(days=12)
        check_out = date.today() + timedelta(days=14)
        reservation = Reservation.objects.create(
            user=self.user,
            room=self.room,
            check_in=check_in,
            check_out=check_out,
            guests_count=1,
            total_price=300.00,
            status='confirmed'
        )
        headers = self.get_jwt_header(self.other_user)
        response = self.client.post(f'/api/reservations/{reservation.id}/cancel/', **headers)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 5. Dashboard Stats Test
    def test_admin_dashboard_stats(self):
        headers = self.get_jwt_header(self.admin)
        response = self.client.get('/api/dashboard/stats/', **headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_admin'])
        self.assertIn('total_hotels', response.data['stats'])
        self.assertIn('total_revenue', response.data['stats'])

    # 6. Reservation state-transition authorization
    def _make_reservation(self, user=None):
        return Reservation.objects.create(
            user=user or self.user,
            room=self.room,
            check_in=date.today() + timedelta(days=30),
            check_out=date.today() + timedelta(days=32),
            guests_count=1,
            total_price=300.00,
            status='confirmed'
        )

    def test_owner_cannot_change_reservation_status(self):
        reservation = self._make_reservation()
        headers = self.get_jwt_header(self.user)
        response = self.client.patch(
            f'/api/reservations/{reservation.id}/',
            {'status': 'completed'},
            format='json',
            **headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')

    def test_owner_cannot_change_booking_terms(self):
        reservation = self._make_reservation()
        headers = self.get_jwt_header(self.user)
        response = self.client.patch(
            f'/api/reservations/{reservation.id}/',
            {'check_out': (date.today() + timedelta(days=45)).strftime('%Y-%m-%d')},
            format='json',
            **headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('check_out', response.data)

    def test_admin_can_change_reservation_status(self):
        reservation = self._make_reservation()
        headers = self.get_jwt_header(self.admin)
        response = self.client.patch(
            f'/api/reservations/{reservation.id}/status/',
            {'status': 'completed'},
            format='json',
            **headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'completed')

    def test_non_admin_cannot_change_reservation_status(self):
        reservation = self._make_reservation()
        headers = self.get_jwt_header(self.user)
        response = self.client.patch(
            f'/api/reservations/{reservation.id}/status/',
            {'status': 'completed'},
            format='json',
            **headers
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'confirmed')
