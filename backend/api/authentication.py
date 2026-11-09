import jwt
from datetime import datetime, timezone
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import authentication, exceptions

JWT_CONFIG = getattr(settings, 'JWT_AUTH', {})
SECRET_KEY = JWT_CONFIG.get('SECRET_KEY', settings.SECRET_KEY)
ALGORITHM = JWT_CONFIG.get('ALGORITHM', 'HS256')
ACCESS_LIFETIME = JWT_CONFIG.get('ACCESS_TOKEN_LIFETIME')

def generate_tokens_for_user(user):
    """
    Generate access and refresh JWT tokens using PyJWT
    """
    now = datetime.now(timezone.utc)
    access_exp = now + ACCESS_LIFETIME
    refresh_exp = now + JWT_CONFIG.get('REFRESH_TOKEN_LIFETIME', ACCESS_LIFETIME * 4)

    access_payload = {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'exp': access_exp,
        'iat': now,
        'type': 'access',
    }

    refresh_payload = {
        'user_id': user.id,
        'exp': refresh_exp,
        'iat': now,
        'type': 'refresh',
    }

    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        'access': access_token,
        'refresh': refresh_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
        }
    }


class JWTAuthentication(authentication.BaseAuthentication):
    """
    PyJWT-based DRF Authentication Handler
    Expects Authorization: Bearer <token>
    """
    def authenticate_header(self, request):
        return 'Bearer realm="api"'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Invalid token.')

        user_id = payload.get('user_id')
        if not user_id:
            raise exceptions.AuthenticationFailed('Invalid token payload.')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found.')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User is inactive.')

        return (user, payload)
