"""
HTTP security headers that Django's settings do not cover.

Django's SecurityMiddleware already handles HSTS, SSL redirect, nosniff,
Referrer-Policy, X-Frame-Options and Cross-Origin-Opener-Policy. This
middleware adds a Content-Security-Policy and a Permissions-Policy.
"""


class SecurityHeadersMiddleware:
    """
    Adds a Content-Security-Policy and a Permissions-Policy to every response.

    API responses get a deny-all policy because they are JSON and should never
    load or execute anything. Server-rendered HTML (the Django admin, and DRF's
    browsable API while DEBUG is on) relies on inline scripts and styles, so it
    gets a restricted policy that still allows its own assets.
    """

    STRICT_CSP = (
        "default-src 'none'; "
        "base-uri 'none'; "
        "form-action 'none'; "
        "frame-ancestors 'none'"
    )
    HTML_CSP = (
        "default-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' 'unsafe-inline'; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'"
    )
    PERMISSIONS_POLICY = (
        'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        is_html = 'text/html' in response.get('Content-Type', '')
        response.setdefault(
            'Content-Security-Policy',
            self.HTML_CSP if is_html else self.STRICT_CSP,
        )
        response.setdefault('Permissions-Policy', self.PERMISSIONS_POLICY)
        return response
