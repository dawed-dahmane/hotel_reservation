from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator

class Hotel(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField()
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    star_rating = models.IntegerField(
        default=4,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    image_url = models.TextField(blank=True, default='')
    amenities = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Hotel.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.city})"


class Room(models.Model):
    ROOM_TYPES = [
        ('single', 'Single Standard'),
        ('double', 'Double Deluxe'),
        ('suite', 'Executive Suite'),
        ('family', 'Family Suite'),
        ('presidential', 'Presidential Suite'),
    ]

    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='rooms')
    room_number = models.CharField(max_length=20)
    room_type = models.CharField(max_length=50, choices=ROOM_TYPES, default='double')
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    capacity = models.IntegerField(default=2, validators=[MinValueValidator(1)])
    bed_type = models.CharField(max_length=50, default='King Size Bed')
    size_sqm = models.IntegerField(default=35)
    description = models.TextField(blank=True, default='')
    image_url = models.TextField(blank=True, default='')
    amenities = models.JSONField(default=list, blank=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('hotel', 'room_number')

    def __str__(self):
        return f"{self.hotel.name} - Room {self.room_number} ({self.get_room_type_display()})"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='reservations')
    check_in = models.DateField()
    check_out = models.DateField()
    guests_count = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    guest_name = models.CharField(max_length=150, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=30, blank=True)
    special_requests = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.id} - {self.room} ({self.user.username})"


class Review(models.Model):
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.user.username} on {self.hotel.name}"
