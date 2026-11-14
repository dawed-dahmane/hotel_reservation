from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    RefreshTokenView,
    CurrentUserProfileView,
    HotelListCreateView,
    HotelDetailView,
    RoomListCreateView,
    RoomDetailView,
    ReservationListCreateView,
    ReservationDetailView,
    ReservationCancelView,
    ReservationStatusView,
    ReviewListCreateView,
    DashboardStatsView,
)

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='token-refresh'),
    path('auth/profile/', CurrentUserProfileView.as_view(), name='user-profile'),

    # Hotel Endpoints
    path('hotels/', HotelListCreateView.as_view(), name='hotel-list-create'),
    path('hotels/<int:pk>/', HotelDetailView.as_view(), name='hotel-detail'),

    # Room Endpoints
    path('rooms/', RoomListCreateView.as_view(), name='room-list-create'),
    path('rooms/<int:pk>/', RoomDetailView.as_view(), name='room-detail'),

    # Reservation Endpoints
    path('reservations/', ReservationListCreateView.as_view(), name='reservation-list-create'),
    path('reservations/<int:pk>/', ReservationDetailView.as_view(), name='reservation-detail'),
    path('reservations/<int:pk>/cancel/', ReservationCancelView.as_view(), name='reservation-cancel'),
    path('reservations/<int:pk>/status/', ReservationStatusView.as_view(), name='reservation-status'),

    # Review Endpoints
    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),

    # Dashboard Stats
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
]

