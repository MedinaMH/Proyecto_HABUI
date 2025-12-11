from django.urls import path
from .import views

urlpatterns = [
    path('login', views.panel_login, name='pwms_login'),
]