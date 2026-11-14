from datetime import date
from django.db.models import Sum, Count, Q
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Hotel, Room, Reservation, Review
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    RefreshTokenSerializer,
    HotelSerializer,
    RoomSerializer,
    ReservationSerializer,
    ReviewSerializer
)
from .permissions import IsAdminOrReadOnly, IsOwnerOrAdmin, IsAdminUserOnly
from .throttling import AuthRateThrottle, LoginUsernameRateThrottle


class RegisterView(APIView):
    """
    Class-based view for User Registration
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            from .authentication import generate_tokens_for_user
            tokens = generate_tokens_for_user(user)
            return Response(tokens, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    Class-based view for User Login using PyJWT
    """
    permission_classes = [permissions.AllowAny]
    # Per-IP limit plus a per-account limit so rotating IPs does not make
    # password guessing against a single account unlimited.
    throttle_classes = [AuthRateThrottle, LoginUsernameRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """
    Rotate a refresh token: the presented token is revoked and a new access /
    refresh pair is returned.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        if serializer.is_valid():
            return Response(serializer.save(), status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserProfileView(APIView):
    """
    Class-based view to fetch the logged-in user's profile and roles
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HotelListCreateView(generics.ListCreateAPIView):
    """
    Class-based view to list hotels or create a new hotel (Admin only)
    """
    queryset = Hotel.objects.all().order_by('-created_at')
    serializer_class = HotelSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Hotel.objects.all().order_by('-created_at')
        search = self.request.query_params.get('search', None)
        city = self.request.query_params.get('city', None)
        featured = self.request.query_params.get('featured', None)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(city__icontains=search) |
                Q(country__icontains=search) |
                Q(description__icontains=search)
            )
        if city:
            queryset = queryset.filter(city__iexact=city)
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset


class HotelDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Class-based view for Hotel CRUD details, update, delete
    """
    queryset = Hotel.objects.all()
    serializer_class = HotelSerializer
    permission_classes = [IsAdminOrReadOnly]


class RoomListCreateView(generics.ListCreateAPIView):
    """
    Class-based view to list rooms or create a room (Admin only)
    """
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Room.objects.select_related('hotel').all().order_by('hotel', 'room_number')
        hotel_id = self.request.query_params.get('hotel', None)
        room_type = self.request.query_params.get('type', None)
        capacity = self.request.query_params.get('capacity', None)
        available_only = self.request.query_params.get('available', None)
        check_in = self.request.query_params.get('check_in', None)
        check_out = self.request.query_params.get('check_out', None)

        if hotel_id:
            queryset = queryset.filter(hotel_id=hotel_id)
        if room_type:
            queryset = queryset.filter(room_type=room_type)
        if capacity:
            try:
                queryset = queryset.filter(capacity__gte=int(capacity))
            except ValueError:
                pass
        if available_only == 'true':
            queryset = queryset.filter(is_available=True)

        # Date range availability filtering
        if check_in and check_out:
            booked_room_ids = Reservation.objects.filter(
                status__in=['pending', 'confirmed'],
                check_in__lt=check_out,
                check_out__gt=check_in
            ).values_list('room_id', flat=True)
            queryset = queryset.exclude(id__in=booked_room_ids)

        return queryset


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Class-based view to retrieve, update, or delete a room
    """
    queryset = Room.objects.select_related('hotel').all()
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]


class ReservationListCreateView(generics.ListCreateAPIView):
    """
    Class-based view to list reservations (user's own or all if admin) and create new
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            queryset = Reservation.objects.select_related('user', 'room', 'room__hotel').all()
        else:
            queryset = Reservation.objects.select_related('user', 'room', 'room__hotel').filter(user=user)

        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.order_by('-created_at')


class ReservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Class-based view to get, update or delete a reservation
    """
    queryset = Reservation.objects.select_related('user', 'room', 'room__hotel').all()
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def perform_destroy(self, instance):
        # Instead of hard delete, can cancel or delete based on query param
        hard_delete = self.request.query_params.get('hard', 'false') == 'true'
        if hard_delete or self.request.user.is_staff:
            instance.delete()
        else:
            instance.status = 'cancelled'
            instance.save()


class ReservationCancelView(APIView):
    """
    Class-based view to easily cancel a booking
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            if request.user.is_staff:
                reservation = Reservation.objects.get(pk=pk)
            else:
                reservation = Reservation.objects.get(pk=pk, user=request.user)
        except Reservation.DoesNotExist:
            return Response({"error": "Reservation not found or access denied."}, status=status.HTTP_404_NOT_FOUND)

        if reservation.status == 'cancelled':
            return Response({"message": "Reservation is already cancelled."}, status=status.HTTP_200_OK)

        if reservation.status == 'completed':
            return Response(
                {"error": "Completed reservations cannot be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reservation.status = 'cancelled'
        reservation.save()
        serializer = ReservationSerializer(reservation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReservationStatusView(APIView):
    """
    Staff-only status transition for a reservation.
    Owners cannot change the status of their own booking through the detail
    endpoint; only staff may move it between pending/confirmed/cancelled/completed.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUserOnly]

    def patch(self, request, pk):
        try:
            reservation = Reservation.objects.get(pk=pk)
        except Reservation.DoesNotExist:
            return Response({"error": "Reservation not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        allowed = {choice for choice, _label in Reservation.STATUS_CHOICES}
        if new_status not in allowed:
            return Response(
                {"status": f"Invalid status. Choose one of: {', '.join(sorted(allowed))}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reservation.status = new_status
        reservation.save(update_fields=['status', 'updated_at'])
        serializer = ReservationSerializer(reservation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReviewListCreateView(generics.ListCreateAPIView):
    """
    Class-based view to list and post reviews
    """
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        hotel_id = self.request.query_params.get('hotel', None)
        if hotel_id:
            return Review.objects.filter(hotel_id=hotel_id).order_by('-created_at')
        return Review.objects.all().order_by('-created_at')


class DashboardStatsView(APIView):
    """
    Class-based view for Admin / Manager Dashboard Statistics
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Admin statistics
        if user.is_staff:
            total_hotels = Hotel.objects.count()
            total_rooms = Room.objects.count()
            total_reservations = Reservation.objects.count()
            confirmed_reservations = Reservation.objects.filter(status='confirmed').count()
            pending_reservations = Reservation.objects.filter(status='pending').count()
            cancelled_reservations = Reservation.objects.filter(status='cancelled').count()
            
            total_revenue = Reservation.objects.filter(
                status__in=['confirmed', 'completed']
            ).aggregate(total=Sum('total_price'))['total'] or 0

            recent_bookings = Reservation.objects.select_related('user', 'room', 'room__hotel').order_by('-created_at')[:8]
            recent_bookings_data = ReservationSerializer(recent_bookings, many=True).data

            return Response({
                'is_admin': True,
                'stats': {
                    'total_hotels': total_hotels,
                    'total_rooms': total_rooms,
                    'total_reservations': total_reservations,
                    'confirmed_reservations': confirmed_reservations,
                    'pending_reservations': pending_reservations,
                    'cancelled_reservations': cancelled_reservations,
                    'total_revenue': float(total_revenue),
                },
                'recent_bookings': recent_bookings_data
            })
        else:
            # Customer statistics
            user_bookings = Reservation.objects.filter(user=user)
            total_user_reservations = user_bookings.count()
            active_reservations = user_bookings.filter(status__in=['confirmed', 'pending'], check_out__gte=date.today()).count()
            total_spent = user_bookings.filter(status__in=['confirmed', 'completed']).aggregate(total=Sum('total_price'))['total'] or 0

            return Response({
                'is_admin': False,
                'stats': {
                    'total_reservations': total_user_reservations,
                    'active_reservations': active_reservations,
                    'total_spent': float(total_spent),
                },
                'recent_bookings': ReservationSerializer(user_bookings[:5], many=True).data
            })
