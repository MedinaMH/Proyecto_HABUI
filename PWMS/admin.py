from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .models import (
    PerfilPWMS,
    RegistroFisiologico,
    EvaluacionNASATLX,
    ZungAnxietyScale,
    Mission,
)

class PerfilPWMSInline(admin.StackedInline):
    model = PerfilPWMS
    can_delete = False
    verbose_name_plural = 'Perfil PWMS'
    fields = ('pin', 'fecha_nacimiento', 'genero', 'telefono', 'grupo_sanguineo')

class CustomUserAdmin(UserAdmin):
    inlines = (PerfilPWMSInline,)

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

    def presion_arterial(self, obj):
        return f"{obj.presion_arterial_sistolica}/{obj.presion_arterial_diastolica}"
    presion_arterial.short_description = 'Presión'

    def nivel_estres(self, obj):
        if obj.nivel_estres is not None:
            return f"{obj.nivel_estres}/100"
        return "-"
    nivel_estres.short_description = 'Estrés'

@admin.register(EvaluacionNASATLX)
class EvaluacionNASATLXAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_creacion', 'demanda_mental', 'demanda_fisica', 'puntuacion_total')
    list_filter = ('usuario', 'fecha_creacion')
    search_fields = ('usuario__username', 'tarea_descripcion')
    date_hierarchy = 'fecha_creacion'
    ordering = ('-fecha_creacion',)

@admin.register(ZungAnxietyScale)
class ZungAnxietyScaleAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_registro', 'puntuacion_bruta', 'puntuacion_indice', 'nivel_ansiedad')
    list_filter = ('usuario', 'fecha_registro', 'nivel_ansiedad')
    search_fields = ('usuario__username', 'observaciones')
    date_hierarchy = 'fecha_registro'
    ordering = ('-fecha_registro',)

@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'habitat_type', 'duration_days', 'start_date')
    list_filter = ('habitat_type', 'start_date')
    search_fields = ('name', 'description')
    filter_horizontal = ('crew_members',)

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)