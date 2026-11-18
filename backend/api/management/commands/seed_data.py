import os
import secrets

from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Hotel, Room, Reservation, Review


class Command(BaseCommand):
    help = 'Seeds initial sample data for hotels, rooms, users, and reservations'

    def _password_for(self, env_name, username):
        """Use SEED_*_PASSWORD when provided, otherwise generate a random one.

        Hardcoded seed passwords end up in production logins and CI caches;
        generating them keeps local seeding convenient without shipping a known
        credential.
        """
        password = os.getenv(env_name)
        if password:
            return password
        password = secrets.token_urlsafe(12)
        self.stdout.write(self.style.WARNING(
            f"Generated {username} password: {password} "
            f"(set {env_name} to choose a stable value)"
        ))
        return password

    def handle(self, *args, **options):
        self.stdout.write("Seeding hotel data...")

        # 1. Superuser / Admin
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@luxuryhotels.com',
                'first_name': 'Super',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password(self._password_for('SEED_ADMIN_PASSWORD', 'admin'))
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (username: admin)"))

        # 2. Demo User
        demo_user, created = User.objects.get_or_create(
            username='test_user',
            defaults={ 
                'email': 'test@example.com',
                'first_name': 'test',
                'last_name': 'user',
            }
        )
        if created:
            demo_user.set_password(self._password_for('SEED_DEMO_PASSWORD', 'admin'))
            demo_user.save()
            self.stdout.write(self.style.SUCCESS("Created demo user (username: test_user)"))

        # 3. Sample Hotels
        hotels_data = [
            {
                'name': 'The Grand Azure Resort & Spa',
                'description': 'Experience ultimate beachfront luxury with infinity pools, Michelin-starred dining, and panoramic ocean vistas overlooking the sapphire waters.',
                'address': '124 Promenade des Anglais',
                'city': 'Nice',
                'country': 'France',
                'star_rating': 5,
                'image_url': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
                'amenities': ['Free WiFi', 'Ocean View', 'Infinity Pool', 'Full Spa', 'Michelin Restaurant', 'Valet Parking', 'Fitness Center', 'Cocktail Bar'],
                'is_featured': True,
            },
            {
                'name': 'Metropolitan Skyline Palace',
                'description': 'Perched above Manhattan, offering floor-to-ceiling skyline views, bespoke concierge services, heated rooftop lounge, and private penthouse suites.',
                'address': '742 5th Avenue',
                'city': 'New York',
                'country': 'United States',
                'star_rating': 5,
                'image_url': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
                'amenities': ['High-Speed WiFi', 'Rooftop Bar', 'Spa & Wellness', 'Valet Parking', '24/7 Room Service', 'Business Hub', 'Pet Friendly'],
                'is_featured': True,
            },
            {
                'name': 'Kyoto Imperial Garden Retreat',
                'description': 'A serene sanctuary nestled among ancient bamboo groves and cherry blossoms, blending traditional Japanese zen aesthetics with contemporary luxury.',
                'address': '18 Gion-machi Minamigawa',
                'city': 'Kyoto',
                'country': 'Japan',
                'star_rating': 5,
                'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
                'amenities': ['Free WiFi', 'Onsen Hot Spring', 'Traditional Tea House', 'Zen Garden', 'Japanese Dining', 'Bicycle Rental', 'Airport Shuttle'],
                'is_featured': True,
            },
            {
                'name': 'Alpine Peak Mountain Lodge',
                'description': 'Surrounded by snow-capped alpine summits with ski-in/ski-out convenience, cedarwood saunas, crackling fireplaces, and gourmet fondue cellars.',
                'address': '89 Dorfstrasse',
                'city': 'Zermatt',
                'country': 'Switzerland',
                'star_rating': 4,
                'image_url': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
                'amenities': ['Free High-Speed WiFi', 'Ski Storage', 'Heated Indoor Pool', 'Sauna & Steam Room', 'Fireplace Lounges', 'Fine Dining'],
                'is_featured': False,
            },
        ]

        hotel_objects = []
        for hdata in hotels_data:
            hotel, _ = Hotel.objects.get_or_create(
                name=hdata['name'],
                defaults=hdata
            )
            hotel_objects.append(hotel)

        # 4. Rooms for each hotel
        room_types = [
            ('101', 'single', 130.00, 1, 'Queen Size Bed', 28, 'Cozy and elegant single room tailored for business travelers and solo explorers.', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'),
            ('201', 'double', 220.00, 2, 'King Size Bed', 42, 'Spacious double room equipped with marble bathroom, designer furnishings, and private balcony.', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'),
            ('301', 'suite', 380.00, 3, 'King Bed + Sofa Bed', 65, 'Luxurious executive suite featuring separate living lounge, walk-in closet, and panoramic views.', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'),
            ('401', 'presidential', 750.00, 4, '2 King Beds', 110, 'Opulent penthouse suite with private jacuzzi, butler service, and dedicated dining salon.', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'),
        ]

        all_rooms = []
        for hotel in hotel_objects:
            for rnum, rtype, price, cap, bed, size, desc, img in room_types:
                room, _ = Room.objects.get_or_create(
                    hotel=hotel,
                    room_number=f"{hotel.id}{rnum}",
                    defaults={
                        'room_type': rtype,
                        'price_per_night': price,
                        'capacity': cap,
                        'bed_type': bed,
                        'size_sqm': size,
                        'description': desc,
                        'image_url': img,
                        'amenities': ['Smart TV 55"', 'Espresso Machine', 'Air Conditioning', 'Bathrobe & Slippers', 'Minibar', 'Safe Box'],
                        'is_available': True,
                    }
                )
                all_rooms.append(room)

        # 5. Sample Reservations for demo_user
        if all_rooms:
            today = date.today()
            # Active reservation
            Reservation.objects.get_or_create(
                user=demo_user,
                room=all_rooms[1],
                check_in=today + timedelta(days=10),
                check_out=today + timedelta(days=14),
                defaults={
                    'guests_count': 2,
                    'total_price': all_rooms[1].price_per_night * 4,
                    'status': 'confirmed',
                    'guest_name': 'John Doe',
                    'guest_email': 'john@example.com',
                    'guest_phone': '+1 (555) 321-4567',
                    'special_requests': 'High floor room with ocean view if available.',
                }
            )

            # Completed reservation
            Reservation.objects.get_or_create(
                user=demo_user,
                room=all_rooms[2],
                check_in=today - timedelta(days=20),
                check_out=today - timedelta(days=17),
                defaults={
                    'guests_count': 2,
                    'total_price': all_rooms[2].price_per_night * 3,
                    'status': 'completed',
                    'guest_name': 'John Doe',
                    'guest_email': 'john@example.com',
                    'guest_phone': '+1 (555) 321-4567',
                    'special_requests': 'Late check-in at 8 PM.',
                }
            )

        # 6. Sample Reviews
        for hotel in hotel_objects[:3]:
            Review.objects.get_or_create(
                hotel=hotel,
                user=demo_user,
                defaults={
                    'rating': 5,
                    'comment': 'Exceptional experience! The staff was incredibly welcoming, the amenities were world-class, and the views took our breath away.',
                }
            )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with rich sample hotels, rooms, reservations, and reviews!"))

