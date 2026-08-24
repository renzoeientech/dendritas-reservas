from rest_framework import generics, permissions

from apps.users.permissions import IsSuperAdmin
from apps.users.serializers import CompanySerializer

from .models import Company


class CompanyListView(generics.ListAPIView):
    queryset = Company.objects.all().order_by("name")
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
