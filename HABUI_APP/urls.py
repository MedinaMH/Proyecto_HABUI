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
    # ---------------Alimentos--------------------
    path('alimentos_rems', views.panel_alimentos_rems, name='panel_alimentos_rems'),
    path('alimentos-rems/<int:recurso_id>/', views.panel_alimentos_rems, name='panel_alimentos_id'),
    # API endpoints
    path('api/alimentos/estado/', views.api_alimentos_estado, name='api_alimentos_estado'),  # GET
    path('api/alimentos/consumos/recientes/', views.api_alimentos_consumos_recientes, name='api_alimentos_consumos_recientes'),  # GET
    path('api/alimentos/consumos/diarios/', views.api_alimentos_consumos_diarios, name='api_alimentos_consumos_diarios'),  # GET
    path('api/alimentos/registrar-consumo/', views.api_alimentos_registrar_consumo, name='api_alimentos_registrar_consumo'),  # POST
    path('api/alimentos/reset/', views.api_alimentos_reset, name='api_alimentos_reset'),  # POST
    #---------------------------------------------
    path('temperatura_rems', views.panel_temperatura_rems, name='temperatura_rems'),
    path('humedad_rems', views.panel_humedad_rems, name='humedad_rems'),
]