from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow read-only requests for anyone, but write/delete permissions only to staff/admin users.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object or admins to view or edit it.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        # For reservations or objects with a 'user' attribute
        return getattr(obj, 'user', None) == request.user


class IsAdminUserOnly(permissions.BasePermission):
    """
    Permission check strictly for staff or admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

