"""Shared pagination for every list endpoint."""

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Page-number pagination with a bounded page size.

    The cap matters: without it a caller can request every row in one response,
    which is exactly the unbounded-resource-consumption problem pagination is
    meant to fix.
    """

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100
