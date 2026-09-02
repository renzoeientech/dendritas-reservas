from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django.urls import path

from .views import CompanyUserDetailView, CompanyUserListCreateView, MeView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("company-users/", CompanyUserListCreateView.as_view(), name="company-user-list-create"),
    path("company-users/<int:pk>/", CompanyUserDetailView.as_view(), name="company-user-detail"),
]
