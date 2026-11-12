"""
Rate limits for authentication endpoints.

The rates themselves live in settings under ``REST_FRAMEWORK`` ->
``DEFAULT_THROTTLE_RATES`` so they can be tuned per environment.
"""
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Per-client-IP limit applied to login and registration."""

    scope = 'auth'


class LoginUsernameRateThrottle(SimpleRateThrottle):
    """
    Per-account limit for login.

    Complements the per-IP throttle so that guessing one account's password is
    bounded even when the attacker rotates source addresses (botnets, proxies).
    Requests without a username fall back to the IP-based throttle.
    """

    scope = 'login_user'

    def get_cache_key(self, request, view):
        try:
            data = request.data
        except Exception:
            return None
        if not isinstance(data, dict):
            return None

        username = str(data.get('username') or '').strip().lower()
        if not username:
            return None

        return self.cache_format % {'scope': self.scope, 'ident': username}
