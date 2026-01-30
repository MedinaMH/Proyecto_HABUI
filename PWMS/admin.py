from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico

# Extender UserAdmin para mostrar perfil PWMS
class PerfilPWMSInline(admin.StackedInline):
    model = PerfilPWMS
    can_delete = False
    verbose_name_plural = 'Perfil PWMS'
    fields = ('pin', 'fecha_nacimiento', 'genero', 'telefono', 'grupo_sanguineo')

class CustomUserAdmin(UserAdmin):
    inlines = (PerfilPWMSInline,)

# Registrar modelos para 
@admin.register(RegistroFisiologico)
class RegistroFisiologicoAdmin(admin.ModelAdmin):
    list_display = (
        'usuario', 
        'fecha', 
        'frecuencia_cardiaca',
        'presion_arterial',
        'temperatura',
        'oxigenacion_sangre',
        'pasos_diarios',
        'nivel_estres',
        'dispositivo_origen'
    )
    list_filter = ('usuario', 'fecha', 'dispositivo_origen')
    search_fields = ('usuario__username', 'notas_adicionales')
    date_hierarchy = 'fecha'
    ordering = ('-fecha',)
    
    # Campo personalizado para presión arterial
    def presion_arterial(self, obj):
        return f"{obj.presion_arterial_sistolica}/{obj.presion_arterial_diastolica}"
    presion_arterial.short_description = 'Presión'
    
    # Campo personalizado para nivel de estrés
    def nivel_estres(self, obj):
        if obj.nivel_estres:
            return f"{obj.nivel_estres}/100"
        return "-"
    nivel_estres.short_description = 'Estrés'

@admin.register(RegistroPsicologico)
class RegistroPsicologicoAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha', 'nivel_estres', 'nivel_ansiedad', 'estado_animo')
    list_filter = ('usuario', 'fecha')
    search_fields = ('usuario__username', 'notas_dia')
    date_hierarchy = 'fecha'
    ordering = ('-fecha',)

# Re-registrar UserAdmin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)