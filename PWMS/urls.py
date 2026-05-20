from django.urls import path
from . import api_views, views

#from .views import export_stress_vocabulary

# Importar vistas de la API HealthSync Pro
from PWMS.views import (
    HealthSyncLoginAPI,
    HealthSyncRegisterAPI,  
    HealthSyncLogoutAPI,
    HealthSyncPerfilAPI,
    HealthSyncRegistroFisiologicoAPI,  # ← Solo este
    HealthSyncDashboardAPI,
    healthsync_status_api,              # ← Para /api/healthsync/status/
    healthsync_verify_token_api
)

app_name = 'PWMS'

# ===== URLs WEB (interfaz HTML) =====
web_urls = [
    # Autenticación web
    path('', api_views.panel_login, name='panel_login'),
    path('login/', api_views.panel_login, name='panel_login'),
    path('logout/', api_views.panel_logout, name='panel_logout'),
    path('registro/', api_views.registro_usuario, name='registro_usuario'),
    
    # Perfil web
    path('perfil/', api_views.perfil, name='perfil'),
    path('completar_perfil/', api_views.completar_perfil, name='completar_perfil'),
    
    # Dashboard web
    path('dashboard/', api_views.pwms_dashboard, name='pwms_dashboard'),
    
    # Registros web
    path('nuevo_registro_psicologico/', api_views.nuevo_registro_psicologico, name='nuevo_registro_psicologico'),
    path('nuevo_registro_fisiologico/', api_views.nuevo_registro_fisiologico, name='nuevo_registro_fisiologico'),
    path('historial_psicologico/', api_views.historial_psicologico, name='historial_psicologico'),
    path('historial-psic-integrado/', api_views.historial_psicologico, name='historial_psic_integrado'),
    path('historial_fisiologico/', api_views.historial_fisiologico, name='historial_fisiologico'),
    
    # Gráficos web
    path('graficas/presion-arterial/', api_views.grafica_presion_arterial, name='grafica_presion_arterial'),
    path('graficas/frecuencia-cardiaca/', api_views.grafica_frecuencia_cardiaca, name='grafica_frecuencia_cardiaca'),
    path('graficas/temperatura/', api_views.grafica_temperatura, name='grafica_temperatura'),
    path('graficas/pasos-actividad/', api_views.grafica_pasos_actividad, name='grafica_pasos_actividad'),
    path('graficas/sueno/', api_views.grafica_sueno, name='grafica_sueno'),
    path('graficas/oxigenacion/', api_views.grafica_oxigenacion, name='grafica_oxigenacion'),
    path('graficas/psicologico/', api_views.grafica_psicologico, name='grafica_psicologico'),
    
    # NASA TLX (web)
    path('nasa-tlx/', api_views.nasa_tlx_create, name='nasa_tlx_create'),
    path('nasa-tlx/resultado/<int:pk>/', api_views.nasa_tlx_resultado, name='nasa_tlx_resultado'),
    path('nasa-tlx/historial/', api_views.nasa_tlx_historial, name='nasa_tlx_historial'),
    
    # Zung Anxiety (web)
    path('zung-anxiety/nuevo/', api_views.zung_anxiety_nuevo, name='zung_anxiety_nuevo'),
    path('zung-anxiety/<int:pk>/resultados/', api_views.zung_anxiety_resultados, name='zung_anxiety_resultados'),
    path('zung-anxiety/historial/', api_views.zung_anxiety_historial, name='zung_anxiety_historial'),

    # ========== URLs para Misiones ==========
    
    # Lista de misiones 
    path('missions/', api_views.missions_list, name='missions_list'),
    
    # Dashboard con GET (para el botón) - estaba duplicada
    path('mission/dashboard/', api_views.mission_dashboard_by_get, name='mission_dashboard_get'),
    
    # Exportar con GET (para el botón)
    path('mission/export-xml/', api_views.export_mission_by_get, name='export_mission_get'),
    
    path('export-stress/<int:user_id>/', api_views.export_stress_vocabulary, name='export_stress_vocabulary'),
    
    # Exportación a XML para AnalogCrewStudy (con ID en ruta)
    path('mission/<int:mission_id>/export-analog-xml/', api_views.export_mission_to_analog_xml, name='export_analog_xml'),
    
    # Dashboard de misión (con ID en ruta)
    path('mission/<int:mission_id>/dashboard/', api_views.mission_dashboard, name='mission_dashboard'),
    
    # API de estadísticas
    path('api/mission/<int:mission_id>/stats/', api_views.api_mission_stats, name='api_mission_stats'),

    path('mission/new/', api_views.mission_form, name='mission_form_new'),
    path('mission/edit/<int:mission_id>/', api_views.mission_form, name='mission_form_edit'),
    path('api/save-mission/', api_views.api_save_mission, name='save_mission'),
    path('api/delete-mission/<int:mission_id>/', api_views.api_delete_mission, name='delete_mission'),

    path('mission/<int:mission_id>/heatmap/', api_views.heatmap_view, name='heatmap_view'),
    path('api/mission/<int:mission_id>/heatmap-data/', api_views.heatmap_data_api, name='heatmap_data'), 
]

# ===== URLs API (para apps) =====
api_urls = [
    # Health check (solo uno)
    path('api/healthsync/status/', healthsync_status_api, name='healthsync_status'),
    
    # Autenticación API
    path('api/healthsync/login/', HealthSyncLoginAPI.as_view(), name='healthsync_login'),
    path('api/healthsync/register/', HealthSyncRegisterAPI.as_view(), name='healthsync_register'),
    path('api/healthsync/logout/', HealthSyncLogoutAPI.as_view(), name='healthsync_logout'),
    path('api/healthsync/verify-token/', healthsync_verify_token_api, name='healthsync_verify_token'),
    
    # Perfil API
    path('api/healthsync/perfil/', HealthSyncPerfilAPI.as_view(), name='healthsync_perfil'),
    
    # Registros API (¡SOLO UNO para fisiológico!)
    path('api/healthsync/save/', HealthSyncRegistroFisiologicoAPI.as_view(), name='healthsync_save'),
    
    # Dashboard API
    path('api/healthsync/dashboard/', HealthSyncDashboardAPI.as_view(), name='healthsync_dashboard'),
    
    # CSV upload (si es necesario)
    path('api/healthsync/upload-csv/', api_views.upload_health_csv, name='upload_health_csv'),
    
    # Endpoints para gráficas (API)
    path('api/fisiologicos/ultimos/', api_views.api_fisiologicos_ultimos, name='api_fisiologicos_ultimos'),
    path('api/fisiologicos/estadisticas/', api_views.api_fisiologicos_estadisticas, name='api_fisiologicos_estadisticas'),
    path('api/fisiologicos/tendencia/', api_views.api_fisiologicos_tendencia, name='api_fisiologicos_tendencia'),
    path('api/fisiologicos/por-fecha/', api_views.api_fisiologicos_por_fecha, name='api_fisiologicos_por_fecha'),
    path('api/fisiologicos/ultimo-vivo/', api_views.api_fisiologicos_ultimo_vivo, name='api_fisiologicos_ultimo_vivo'),
    
    # Endpoints para ML
    path('api/ml/fisiologicos/', api_views.api_ml_datos_fisiologicos, name='api_ml_fisiologicos'),
    path('api/ml/psicologicos/', api_views.api_ml_datos_psicologicos, name='api_ml_psicologicos'),
]

# Combinar todas las URLs
urlpatterns = web_urls + api_urls