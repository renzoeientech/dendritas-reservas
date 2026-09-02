from django.urls import path

from .views import CompanyAdminDetailView, CompanyDetailView, CompanyListCreateView

urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="company-list-create"),
    path("<int:pk>/", CompanyDetailView.as_view(), name="company-detail"),
    path("<int:company_id>/admin/", CompanyAdminDetailView.as_view(), name="company-admin-detail"),
]
