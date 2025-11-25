from django.urls import path
from .import views

urlpatterns = [
    path('', views.panel_principal, name='panel_principal'),
    path('todos_los_recursos', views.panel_all_resources, name='all_resources'),
    path('energia_rems', views.panel_energia_rems, name='panel_energia_rems'),
    path('agua_rems', views.panel_agua_rems, name='panel_agua_rems'),
    path('agua/<int:recurso_id>/', views.panel_agua_rems, name='vista_agua'),
    path('api/agua/', views.api_agua_unity, name='api_agua_unity'), # GET
    path('api/agua/post/', views.api_agua_post, name='api_agua_post'),  # POST
    path('oxigeno_rems', views.panel_oxigeno_rems, name='panel_oxigeno_rems'),
    path('co2_rems', views.panel_co2, name='panel_co2_rems'),
    path('alimentos_rems', views.panel_alimentos_rems, name='panel_alimentos_rems'),
    path('temperatura_rems', views.panel_temperatura_rems, name='temperatura_rems'),
    path('humedad_rems', views.panel_humedad_rems, name='humedad_rems'),
]