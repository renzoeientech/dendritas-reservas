from django.urls import path

from .views import (
    CompanyAdminDetailView,
    CompanyAdminListCreateView,
    CompanyDetailView,
    CompanyListCreateView,
)

urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="company-list-create"),
    path("<int:pk>/", CompanyDetailView.as_view(), name="company-detail"),
    path("<int:company_id>/admins/", CompanyAdminListCreateView.as_view(), name="company-admin-list-create"),
    path(
        "<int:company_id>/admins/<int:admin_id>/",
        CompanyAdminDetailView.as_view(),
        name="company-admin-detail",
    ),
]
