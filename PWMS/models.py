from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class PerfilPWMS(models.Model):
    """
    Perfil extendido para usuarios del sistema PWMS
    """
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_pwms')
    
    # Datos personales
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=20, choices=[
        ('masculino', 'Masculino'),
        ('femenino', 'Femenino'),
        ('otro', 'Otro'),
        ('prefiero_no_decirlo', 'Prefiero no decirlo')
    ], null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    
    # PIN de 4 dígitos
    pin = models.CharField(max_length=4, help_text="PIN de 4 dígitos para acceso rápido")
    
    # Datos médicos básicos
    grupo_sanguineo = models.CharField(max_length=5, null=True, blank=True)
    alergias = models.TextField(null=True, blank=True)
    medicamentos = models.TextField(null=True, blank=True)
    condiciones_medicas = models.TextField(null=True, blank=True)
    
    # Datos psicológicos iniciales
    fecha_ingreso = models.DateField(auto_now_add=True)
    psicologo_asignado = models.CharField(max_length=100, null=True, blank=True)
    motivo_consulta = models.TextField(null=True, blank=True)
    
    # Configuración de privacidad
    compartir_datos_medicos = models.BooleanField(default=False)
    recibir_recordatorios = models.BooleanField(default=True)
    
    # Metadatos
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Perfil PWMS - {self.usuario.username}"
    
    class Meta:
        verbose_name = "Perfil PWMS"
        verbose_name_plural = "Perfiles PWMS"

# Señal para crear perfil automáticamente cuando se crea un usuario
@receiver(post_save, sender=User)
def crear_perfil_pwms(sender, instance, created, **kwargs):
    if created:
        PerfilPWMS.objects.create(usuario=instance)

@receiver(post_save, sender=User)
def guardar_perfil_pwms(sender, instance, **kwargs):
    instance.perfil_pwms.save()

class RegistroPsicologico(models.Model):
    """
    Registros psicológicos periódicos
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registros_psicologicos')
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Escalas de evaluación
    nivel_estres = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], help_text="1=Sin estrés, 10=Máximo estrés")
    nivel_ansiedad = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], help_text="1=Sin ansiedad, 10=Máxima ansiedad")
    estado_animo = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], help_text="1=Muy bajo, 10=Muy alto")
    
    # Datos cualitativos
    notas_dia = models.TextField(help_text="¿Cómo te sientes hoy?")
    eventos_significativos = models.TextField(null=True, blank=True, help_text="Eventos importantes del día")
    pensamientos_recurrentes = models.TextField(null=True, blank=True)
    
    # Metadatos
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='registros_creados')
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = "Registro Psicológico"
        verbose_name_plural = "Registros Psicológicos"

class RegistroFisiologico(models.Model):
    """
    Registros fisiológicos (signos vitales)
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registros_fisiologicos')
    fecha = models.DateTimeField(auto_now_add=True)
    
    # Signos vitales
    frecuencia_cardiaca = models.IntegerField(help_text="Latidos por minuto")
    presion_arterial_sistolica = models.IntegerField(help_text="Presión sistólica (alta)")
    presion_arterial_diastolica = models.IntegerField(help_text="Presión diastólica (baja)")
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, help_text="Temperatura en °C")
    oxigenacion_sangre = models.IntegerField(help_text="SpO2 en porcentaje")
    
    # Actividad física
    pasos_diarios = models.IntegerField(default=0)
    calorias_quemadas = models.IntegerField(default=0)
    horas_sueno = models.DecimalField(max_digits=5, decimal_places=2,null=True, blank=True, help_text="Horas de sueño (ej: 7.75 = 7 horas 45 minutos) ")
    
    # ⭐⭐ NUEVOS CAMPOS PARA LOS 4 PORCENTAJES DE ESTRÉS ⭐⭐
    estres_relajado = models.IntegerField(
        default=0, 
        help_text="Porcentaje de tiempo relajado (0-100%)"
    )
    estres_bajo = models.IntegerField(
        default=0, 
        help_text="Porcentaje de tiempo con estrés bajo (0-100%)"
    )
    estres_moderado = models.IntegerField(
        default=0, 
        help_text="Porcentaje de tiempo con estrés moderado (0-100%)"
    )
    estres_alto = models.IntegerField(
        default=0, 
        help_text="Porcentaje de tiempo con estrés alto (0-100%)"
    )
    
    # Nivel de estrés calculado (el que ya tienes)
    nivel_estres = models.IntegerField(
        null=True, 
        blank=True, 
        help_text="Nivel de estrés calculado (0-100)"
    )
    
    puntuacion_sueno = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Puntuación de sueño (0-100)"
    )
    notas_adicionales = models.TextField(
        null=True, 
        blank=True, 
        help_text="Notas adicionales del usuario"
    )
    
    # Metadatos
    dispositivo_origen = models.CharField(
        max_length=50, 
        null=True, 
        blank=True,
        default="HealthSync Pro"
    )
    
    class Meta:
        ordering = ['-fecha']
        verbose_name = "Registro Fisiológico"
        verbose_name_plural = "Registros Fisiológicos"
    
    # ⭐⭐ MÉTODO PARA CALCULAR AUTOMÁTICAMENTE EL NIVEL DE ESTRÉS ⭐⭐
    def calcular_nivel_estres(self):
        """
        Calcula el nivel de estrés basado en los porcentajes
        Fórmula: (Relajado*0 + Bajo*25 + Moderado*50 + Alto*75) / 100
        """
        return (self.estres_relajado * 0 + 
                self.estres_bajo * 25 + 
                self.estres_moderado * 50 + 
                self.estres_alto * 75) // 100
    
    def save(self, *args, **kwargs):
        # Calcular nivel de estrés antes de guardar
        if self.nivel_estres is None or self.nivel_estres == 0:
            self.nivel_estres = self.calcular_nivel_estres()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.usuario.username} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"
    class Meta:
        ordering = ['-fecha']
        verbose_name = "Registro Fisiológico"
        verbose_name_plural = "Registros Fisiológicos"