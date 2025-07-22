from django.urls import path
from .import views

urlpatterns = [
    path('', views.panel_principal, name='panel_principal'),
    path('energia_rems', views.panel_energia_rems, name='panel_energia_rems'),
    path('agua_rems', views.panel_agua_rems, name='panel_agua_rems'),
    path('oxigeno_rems', views.panel_oxigeno_rems, name='panel_oxigeno_rems'),
    path('alimentos_rems', views.panel_alimentos_rems, name='panel_alimentos_rems'),
    path('todos_los_recursos', views.panel_all_resources, name='all_resources')
]