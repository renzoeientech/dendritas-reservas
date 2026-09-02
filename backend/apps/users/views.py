from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Role, User
from .permissions import IsCompanyAdmin
from .serializers import CompanyUserCreateSerializer, UserSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CompanyUserListCreateView(generics.ListCreateAPIView):
    """Lista y crea usuarios (role=member) de la empresa del admin autenticado."""

    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company, is_active=True).order_by("email")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CompanyUserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=201)


class CompanyUserDetailView(generics.DestroyAPIView):
    """Elimina (desactiva) un usuario miembro (role=member) de la empresa del admin autenticado.

    Se desactiva en vez de borrar para no perder el historial de reservas del
    usuario (Booking.user usa on_delete=PROTECT) y para que la baja funcione
    siempre, tenga o no reservas asociadas.
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        return User.objects.filter(company=self.request.user.company, role=Role.MEMBER, is_active=True)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
