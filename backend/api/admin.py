from django.contrib import admin
from .models import Hotel, Room, Reservation, Review

@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'country', 'star_rating', 'is_featured', 'created_at')
    list_filter = ('city', 'country', 'star_rating', 'is_featured')
    search_fields = ('name', 'city', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('hotel', 'room_number', 'room_type', 'price_per_night', 'capacity', 'is_available')
    list_filter = ('room_type', 'is_available', 'hotel')
    search_fields = ('room_number', 'hotel__name')


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'room', 'check_in', 'check_out', 'total_price', 'status', 'created_at')
    list_filter = ('status', 'check_in', 'check_out')
    search_fields = ('user__username', 'room__room_number', 'guest_name', 'guest_email')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('hotel', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
