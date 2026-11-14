import logging
from datetime import date, datetime, timezone
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import IntegrityError, connection, transaction
from rest_framework import serializers
from .models import Hotel, Room, Reservation, Review, RevokedRefreshToken
from .authentication import decode_refresh_token, generate_tokens_for_user
from django.contrib.auth.password_validation import validate_password

# Failed authentication events. Configured in settings.LOGGING so they can be
# shipped to a SIEM/alerting pipeline. Never log passwords or tokens.
security_logger = logging.getLogger('api.security')


def _client_ip(request):
    if request is None:
        return 'unknown'
    return request.META.get('REMOTE_ADDR') or 'unknown'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff']
        read_only_fields = ['id', 'is_staff']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("Email address is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        validate_password(attrs['password']) 
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if not username or not password:
            raise serializers.ValidationError("Both username and password are required.")

        user = authenticate(username=username, password=password)
        if not user:
            # Also allow login with email
            try:
                user_obj = User.objects.get(email__iexact=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass

        if not user:
            security_logger.warning(
                "Login failed for username=%r ip=%s reason=invalid_credentials",
                username,
                _client_ip(self.context.get('request')),
            )
            raise serializers.ValidationError("Invalid credentials. Please check your username and password.")

        if not user.is_active:
            security_logger.warning(
                "Login failed for username=%r ip=%s reason=inactive_account",
                username,
                _client_ip(self.context.get('request')),
            )
            raise serializers.ValidationError("This user account is inactive.")

        tokens = generate_tokens_for_user(user)
        return tokens


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'hotel', 'user', 'user_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        hotel = attrs.get('hotel') or getattr(self.instance, 'hotel', None)
        if not user or not user.is_authenticated or hotel is None:
            return attrs

        # Reviews are only credible from guests who actually completed a stay:
        # without this an account can post arbitrary reviews and move ratings.
        stayed = Reservation.objects.filter(
            user=user,
            room__hotel=hotel,
            status__in=['confirmed', 'completed'],
            check_out__lte=date.today(),
        ).exists()
        if not stayed:
            raise serializers.ValidationError(
                {'hotel': 'You can only review a hotel after a completed stay there.'}
            )

        existing = Review.objects.filter(hotel=hotel, user=user)
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError(
                {'hotel': 'You have already reviewed this hotel.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        try:
            return super().create(validated_data)
        except IntegrityError:
            # Covers the race between the check above and the unique constraint.
            raise serializers.ValidationError(
                {'hotel': 'You have already reviewed this hotel.'}
            )


class RoomSerializer(serializers.ModelSerializer):
    hotel_name = serializers.CharField(source='hotel.name', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)

    class Meta:
        model = Room
        fields = [
            'id',
            'hotel',
            'hotel_name',
            'room_number',
            'room_type',
            'room_type_display',
            'price_per_night',
            'capacity',
            'bed_type',
            'size_sqm',
            'description',
            'image_url',
            'amenities',
            'is_available',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HotelSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    rooms_count = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = [
            'id',
            'name',
            'slug',
            'description',
            'address',
            'city',
            'country',
            'star_rating',
            'image_url',
            'amenities',
            'is_featured',
            'rooms_count',
            'min_price',
            'average_rating',
            'rooms',
            'reviews',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_rooms_count(self, obj):
        return obj.rooms.count()

    def get_min_price(self, obj):
        rooms = obj.rooms.filter(is_available=True)
        if rooms.exists():
            return min(room.price_per_night for room in rooms)
        return None

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            return round(sum(r.rating for r in reviews) / len(reviews), 1)
        return float(obj.star_rating)


class ReservationSerializer(serializers.ModelSerializer):
    room_details = RoomSerializer(source='room', read_only=True)
    hotel_name = serializers.CharField(source='room.hotel.name', read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    nights = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = [
            'id',
            'user',
            'user_details',
            'room',
            'room_details',
            'hotel_name',
            'check_in',
            'check_out',
            'nights',
            'guests_count',
            'total_price',
            'status',
            'guest_name',
            'guest_email',
            'guest_phone',
            'special_requests',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'total_price', 'status', 'created_at', 'updated_at']

    def get_nights(self, obj):
        if obj.check_in and obj.check_out:
            return (obj.check_out - obj.check_in).days
        return 0

    def validate(self, attrs):
        # Booking terms are fixed once the reservation exists. Changing the room
        # or dates would also desynchronise the server-calculated total_price, so
        # the owner must cancel and rebook instead.
        if self.instance:
            immutable = [f for f in ('room', 'check_in', 'check_out') if f in attrs]
            if immutable:
                raise serializers.ValidationError({
                    field: "This field cannot be changed after the reservation is created. Cancel and rebook instead."
                    for field in immutable
                })
            check_in = self.instance.check_in
            check_out = self.instance.check_out
            room = self.instance.room
        else:
            check_in = attrs.get('check_in')
            check_out = attrs.get('check_out')
            room = attrs.get('room')

        guests_count = attrs.get('guests_count', getattr(self.instance, 'guests_count', 1))

        if check_in and check_out:
            if check_in >= check_out:
                raise serializers.ValidationError({"check_out": "Check-out date must be after check-in date."})
            
            # Allow booking starting today or future. Only checked on creation:
            # an existing booking naturally becomes "in the past" as time passes,
            # and that must not block editing its guest details.
            if self.instance is None and check_in < date.today():
                raise serializers.ValidationError({"check_in": "Check-in date cannot be in the past."})

        if room:
            if not room.is_available:
                raise serializers.ValidationError({"room": "This room is currently marked as unavailable for maintenance or repairs."})

            if guests_count > room.capacity:
                raise serializers.ValidationError({"guests_count": f"Maximum capacity for this room is {room.capacity} guest(s)."})

            # Overlapping reservations validation
            overlapping = Reservation.objects.filter(
                room=room,
                status__in=['pending', 'confirmed'],
                check_in__lt=check_out,
                check_out__gt=check_in
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)

            if overlapping.exists():
                raise serializers.ValidationError({"room": "This room is already reserved for the selected dates. Please choose different dates."})

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        room = validated_data['room']
        check_in = validated_data['check_in']
        check_out = validated_data['check_out']

        # Calculate total price
        nights = (check_out - check_in).days
        if nights <= 0:
            nights = 1
        total_price = room.price_per_night * nights

        validated_data['user'] = user
        validated_data['total_price'] = total_price
        
        # Default guest info from user if empty
        if not validated_data.get('guest_name'):
            validated_data['guest_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
        if not validated_data.get('guest_email'):
            validated_data['guest_email'] = user.email

        try:
            with transaction.atomic():
                # Serialise concurrent bookings of the same room. Databases with
                # row locks (PostgreSQL/MySQL) block the second request here;
                # SQLite serialises writers and the unique constraint below
                # catches an identical stay.
                if connection.features.has_select_for_update:
                    room = Room.objects.select_for_update().get(pk=room.pk)
                overlapping = Reservation.objects.filter(
                    room=room,
                    status__in=['pending', 'confirmed'],
                    check_in__lt=check_out,
                    check_out__gt=check_in,
                ).exists()
                if overlapping:
                    raise serializers.ValidationError({
                        "room": "This room is already reserved for the selected dates. "
                                "Please choose different dates."
                    })
                return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError({
                "room": "This room is already reserved for the selected dates. "
                        "Please choose different dates."
            })


class RefreshTokenSerializer(serializers.Serializer):
    """Rotates a refresh token: the presented one is revoked and a new pair issued."""

    refresh = serializers.CharField(write_only=True)

    def validate_refresh(self, value):
        payload = decode_refresh_token(value)
        if RevokedRefreshToken.objects.filter(jti=payload['jti']).exists():
            raise serializers.ValidationError('This refresh token has been revoked.')

        user = User.objects.filter(pk=payload['user_id'], is_active=True).first()
        if user is None:
            raise serializers.ValidationError('User not found or inactive.')

        self._payload = payload
        self._user = user
        return value

    def save(self, **kwargs):
        # Revoke the token that was just presented so a stolen copy cannot be
        # replayed after rotation.
        RevokedRefreshToken.objects.get_or_create(
            jti=self._payload['jti'],
            defaults={
                'expires_at': datetime.fromtimestamp(self._payload['exp'], tz=timezone.utc),
            },
        )
        return generate_tokens_for_user(self._user)

