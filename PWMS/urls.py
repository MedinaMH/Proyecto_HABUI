from django.urls import path, include
from . import views

# Importar vistas de la API HealthSync Pro
from PWMS.api_views import (
    HealthSyncLoginAPI,
    HealthSyncRegisterAPI,  
    HealthSyncLogoutAPI,
    HealthSyncPerfilAPI,
    HealthSyncRegistroPsicologicoAPI,
    HealthSyncRegistroFisiologicoAPI,
    HealthSyncDashboardAPI,
    healthsync_status_api,
    healthsync_verify_token_api,
    HealthSyncSaveDataAPI
)
app_name = 'PWMS'

# URLs principales (web)
urlpatterns = [
    # Statuss del servidor
    path('api/health/', views.health_check, name='health_check'),
    
    # Autenticacion 
    path('', views.panel_login, name='panel_login'),  
    path('login/', views.panel_login, name='panel_login'),
    path('registro/', views.registro_usuario, name='registro_usuario'), 
    path('logout/', views.panel_logout, name='panel_logout'),
    
    # Dashboard y Perfil
    path('dashboard/', views.pwms_dashboard, name='pwms_dashboard'),
    path('perfil/', views.completar_perfil, name='completar_perfil'),
    
    # Gráficos
    path('graficas/presion-arterial/', views.grafica_presion_arterial, name='grafica_presion_arterial'),
    path('graficas/frecuencia-cardiaca/', views.grafica_frecuencia_cardiaca, name='grafica_frecuencia_cardiaca'),
    path('graficas/temperatura/', views.grafica_temperatura, name='grafica_temperatura'),
    path('graficas/pasos-actividad/', views.grafica_pasos_actividad, name='grafica_pasos_actividad'),
    path('graficas/sueno/', views.grafica_sueno, name='grafica_sueno'),
    path('graficas/oxigenacion/', views.grafica_oxigenacion, name='grafica_oxigenacion'),
    path('graficas/psicologico/', views.grafica_psicologico, name='grafica_psicologico'),
    
    # Registros
    path('nuevo_registro_psicologico/', views.nuevo_registro_psicologico, name='nuevo_registro_psicologico'),
    path('nuevo_registro_fisiologico/', views.nuevo_registro_fisiologico, name='nuevo_registro_fisiologico'),
    path('historial_psicologico/', views.historial_psicologico, name='historial_psicologico'),
    path('historial_fisiologico/', views.historial_fisiologico, name='historial_fisiologico'),
    
    # ===== HEALTHSYNC PRO API =====
    # Autenticación
    path('api/healthsync/login/', HealthSyncLoginAPI.as_view(), name='healthsync_login'),
    path('api/healthsync/register/', HealthSyncRegisterAPI.as_view(), name='healthsync_register'),
    path('api/healthsync/logout/', HealthSyncLogoutAPI.as_view(), name='healthsync_logout'),
    
    # Perfil
    path('api/healthsync/perfil/', HealthSyncPerfilAPI.as_view(), name='healthsync_perfil'),
    
    # Registros
    path('api/healthsync/save/', HealthSyncRegistroFisiologicoAPI.as_view(), name='healthsync_save'),
    path('api/healthsync/registro/psicologico/', HealthSyncRegistroPsicologicoAPI.as_view(), name='healthsync_registro_psicologico'),
    path('api/healthsync/registro/fisiologico/', HealthSyncRegistroFisiologicoAPI.as_view(), name='healthsync_registro_fisiologico'),
    # Dashboard
    path('api/healthsync/dashboard/', HealthSyncDashboardAPI.as_view(), name='healthsync_dashboard'),
    
    # Utilidades
    path('api/healthsync/status/', healthsync_status_api, name='healthsync_status'),
    path('api/healthsync/verify-token/', healthsync_verify_token_api, name='healthsync_verify_token'),
    path('api/healthsync/upload-csv/', views.upload_health_csv, name='upload_health_csv')
    
]