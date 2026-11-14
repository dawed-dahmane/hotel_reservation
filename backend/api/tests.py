from datetime import date, timedelta
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Hotel, Room, Reservation, Review

@override_settings(SECURE_SSL_REDIRECT=False)
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
        self.assertIn('results', response.data)
        self.assertGreaterEqual(response.data['count'], 1)

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

    # 7. Transport and header hardening
    def test_api_responses_carry_security_headers(self):
        response = self.client.get('/api/hotels/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertIn("default-src 'none'", response['Content-Security-Policy'])
        self.assertIn("frame-ancestors 'none'", response['Content-Security-Policy'])
        self.assertIn('camera=()', response['Permissions-Policy'])
        self.assertEqual(
            response['Referrer-Policy'],
            'strict-origin-when-cross-origin',
        )

    @override_settings(ALLOWED_HOSTS=['api.example.com'])
    def test_unknown_host_header_is_rejected_and_logged(self):
        with self.assertLogs('django.security', level='WARNING') as logs:
            response = self.client.get('/api/hotels/', HTTP_HOST='attacker.example')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('attacker.example', '\n'.join(logs.output))

    @override_settings(ALLOWED_HOSTS=['api.example.com'])
    def test_allowed_host_header_is_accepted(self):
        response = self.client.get('/api/hotels/', HTTP_HOST='api.example.com')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_env_flag_requires_explicit_opt_in(self):
        import os
        from unittest import mock
        from backend.settings import _env_flag

        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop('DJANGO_TEST_FLAG', None)
            self.assertFalse(_env_flag('DJANGO_TEST_FLAG', default=False))
        with mock.patch.dict(os.environ, {'DJANGO_TEST_FLAG': 'TRUE'}):
            self.assertTrue(_env_flag('DJANGO_TEST_FLAG', default=False))
        with mock.patch.dict(os.environ, {'DJANGO_TEST_FLAG': 'False'}):
            self.assertFalse(_env_flag('DJANGO_TEST_FLAG', default=True))

    # 8. Token handling, pagination, CORS and review integrity
    def test_refresh_token_cannot_authenticate_api_requests(self):
        from api.authentication import generate_tokens_for_user

        tokens = generate_tokens_for_user(self.user)
        response = self.client.get(
            '/api/auth/profile/',
            HTTP_AUTHORIZATION=f"Bearer {tokens['refresh']}",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_rotation_revokes_presented_token(self):
        from api.authentication import generate_tokens_for_user

        tokens = generate_tokens_for_user(self.user)
        first = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn('access', first.data)
        self.assertIn('refresh', first.data)

        replay = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertIn(replay.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))

        # The rotated access token works.
        profile = self.client.get(
            '/api/auth/profile/',
            HTTP_AUTHORIZATION=f"Bearer {first.data['access']}",
        )
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

    def test_access_token_cannot_be_replayed_at_refresh_endpoint(self):
        from api.authentication import generate_tokens_for_user

        tokens = generate_tokens_for_user(self.user)
        response = self.client.post('/api/auth/refresh/', {'refresh': tokens['access']}, format='json')
        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED))

    def test_review_requires_completed_stay_and_is_unique(self):
        headers = self.get_jwt_header(self.user)

        future = Reservation.objects.create(
            user=self.user,
            room=self.room,
            check_in=date.today() + timedelta(days=3),
            check_out=date.today() + timedelta(days=5),
            guests_count=1,
            total_price=300,
            status='confirmed',
        )
        blocked = self.client.post(
            '/api/reviews/',
            {'hotel': self.hotel.id, 'rating': 5, 'comment': 'Too early'},
            format='json',
            **headers,
        )
        self.assertEqual(blocked.status_code, status.HTTP_400_BAD_REQUEST)

        future.status = 'completed'
        future.check_in = date.today() - timedelta(days=5)
        future.check_out = date.today() - timedelta(days=2)
        future.save()

        first = self.client.post(
            '/api/reviews/',
            {'hotel': self.hotel.id, 'rating': 5, 'comment': 'Lovely stay'},
            format='json',
            **headers,
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data['user'], self.user.id)

        duplicate = self.client.post(
            '/api/reviews/',
            {'hotel': self.hotel.id, 'rating': 1, 'comment': 'Second review'},
            format='json',
            **headers,
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_user_field_is_read_only(self):
        headers = self.get_jwt_header(self.user)
        response = self.client.post(
            '/api/reviews/',
            {'hotel': self.hotel.id, 'rating': 4, 'comment': 'x', 'user': self.other_user.id},
            format='json',
            **headers,
        )
        # Rejected for lack of a completed stay, never accepted under another user.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)

    def test_list_endpoints_are_paginated(self):
        for url in ('/api/hotels/', '/api/rooms/', '/api/reviews/'):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK, url)
            self.assertIn('results', response.data, url)
            self.assertIn('count', response.data, url)

        headers = self.get_jwt_header(self.user)
        response = self.client.get('/api/reservations/', **headers)
        self.assertIn('results', response.data)

    def test_page_size_is_capped(self):
        response = self.client.get('/api/hotels/', {'page_size': 100000})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)

    @override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173'], CORS_ALLOW_CREDENTIALS=False)
    def test_cors_rejects_unlisted_original(self):
        evil = self.client.get('/api/hotels/', HTTP_ORIGIN='https://evil.example')
        self.assertIsNone(evil.headers.get('Access-Control-Allow-Origin'))

        allowed = self.client.get('/api/hotels/', HTTP_ORIGIN='http://localhost:5173')
        self.assertEqual(allowed.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173')
        self.assertIsNone(allowed.headers.get('Access-Control-Allow-Credentials'))
