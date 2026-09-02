from django.http import Http404
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.users.models import Role
from apps.users.permissions import IsSuperAdmin
from apps.users.serializers import CompanySerializer

from .models import Company
from .serializers import CompanyAdminAssignSerializer, CompanyCreateSerializer


class CompanyListCreateView(generics.ListCreateAPIView):
    """Lista empresas y permite al superadmin crear una empresa designando su admin."""

    queryset = Company.objects.filter(is_active=True).order_by("name")
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CompanyCreateSerializer
        return CompanySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = serializer.save()
        return Response(CompanySerializer(company).data, status=201)


class CompanyDetailView(generics.DestroyAPIView):
    """Elimina (desactiva) una empresa, junto con todos sus usuarios.

    Se desactiva en vez de borrar para no perder el historial de reservas de
    la empresa y de sus usuarios (Booking.company/user usan on_delete=PROTECT).
    """

    queryset = Company.objects.filter(is_active=True)
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]

    def perform_destroy(self, instance):
        instance.users.filter(is_active=True).update(is_active=False)
        instance.is_active = False
        instance.save(update_fields=["is_active"])


class CompanyAdminDetailView(generics.GenericAPIView):
    """Asigna (POST) o elimina -desactiva- (DELETE) el admin de una empresa.

    La baja desactiva en vez de borrar para no perder el historial de reservas
    del admin (Booking.user usa on_delete=PROTECT) y para que funcione siempre,
    tenga o no reservas asociadas.
    """

    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    serializer_class = CompanyAdminAssignSerializer

    def get_company(self):
        return get_object_or_404(Company, pk=self.kwargs["company_id"])

    def post(self, request, *args, **kwargs):
        company = self.get_company()
        if company.users.filter(role=Role.ADMIN, is_active=True).exists():
            raise ValidationError("La empresa ya tiene un admin asignado. Eliminalo primero.")
        serializer = self.get_serializer(data=request.data, context={"company": company})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CompanySerializer(company).data, status=201)

    def delete(self, request, *args, **kwargs):
        company = self.get_company()
        admin = company.users.filter(role=Role.ADMIN, is_active=True).order_by("id").first()
        if admin is None:
            raise Http404
        admin.is_active = False
        admin.save(update_fields=["is_active"])
        return Response(status=204)
