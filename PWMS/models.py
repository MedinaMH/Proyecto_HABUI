from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator, MaxValueValidator

class PerfilPWMS(models.Model):
    """
    Perfil extendido para usuarios del sistema PWMS
    """
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_pwms')
    # Foto de perfil 
    foto = models.ImageField(upload_to='foto_perfil/', null=True, blank=True, verbose_name="Foto de perfil")
    # Datos personales
    nombre_completo = models.CharField(max_length=150, null=True, blank=True)
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
    
    # Nuevos campos para vocabulario
    role = models.CharField(max_length=20, choices=[
        ('Commander', 'Commander'),
        ('Pilot', 'Pilot'),
        ('Scientist', 'Scientist'),
        ('Engineer', 'Engineer'),
        ('MedicalOfficer', 'Medical Officer'),
        ('PayloadSpecialist', 'Payload Specialist'),
    ], null=True, blank=True)
    experience = models.CharField(max_length=20, choices=[
        ('Novice', 'Novice'),
        ('Experienced', 'Experienced'),
        ('Veteran', 'Veteran'),
    ], null=True, blank=True)
    baseline_stress = models.FloatField(null=True, blank=True, help_text="Baseline stress (1-10)")
    baseline_fatigue = models.FloatField(null=True, blank=True, help_text="Baseline fatigue (1-10)")
    baseline_cognitive = models.FloatField(null=True, blank=True, help_text="Baseline cognitive (0-100)")
    
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
    
    # Campos para vocabulario
    fatiga = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], null=True, blank=True, help_text="Fatiga 1-10")
    positive_affect = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], null=True, blank=True, help_text="Afecto positivo 1-10")
    negative_affect = models.IntegerField(choices=[(i, str(i)) for i in range(1, 11)], null=True, blank=True, help_text="Afecto negativo 1-10")
    
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

class EvaluacionNASATLX(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuario")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de evaluación")
    tarea_descripcion = models.TextField(verbose_name="Descripción de la tarea evaluada", blank=True)

    # Dimensiones (0-20)
    demanda_mental = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    demanda_fisica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    demanda_temporal = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    rendimiento = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    esfuerzo = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    frustracion = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)

    # Pesos (0-5)
    peso_demanda_mental = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_demanda_fisica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_demanda_temporal = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_rendimiento = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_esfuerzo = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_frustracion = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)

    puntuacion_total = models.FloatField(default=0.0, help_text="Escala 0-100")

    # Video y metadatos
    video = models.FileField(upload_to='videos_nasa_tlx/%Y/%m/%d/', null=True, blank=True)
    video_metadata = models.JSONField(null=True, blank=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)

    notas_adicionales = models.TextField(blank=True)

    def calcular_puntuacion_total(self):
        suma_pesos = (self.peso_demanda_mental + self.peso_demanda_fisica +
                      self.peso_demanda_temporal + self.peso_rendimiento +
                      self.peso_esfuerzo + self.peso_frustracion)
        if suma_pesos > 0:
            suma_ponderada = (
                self.demanda_mental * self.peso_demanda_mental +
                self.demanda_fisica * self.peso_demanda_fisica +
                self.demanda_temporal * self.peso_demanda_temporal +
                self.rendimiento * self.peso_rendimiento +
                self.esfuerzo * self.peso_esfuerzo +
                self.frustracion * self.peso_frustracion
            )
            total = (suma_ponderada / (suma_pesos * 20)) * 100
        else:
            promedio = (self.demanda_mental + self.demanda_fisica +
                        self.demanda_temporal + self.rendimiento +
                        self.esfuerzo + self.frustracion) / 6
            total = (promedio / 20) * 100
        return round(total, 2)

    def save(self, *args, **kwargs):
        self.puntuacion_total = self.calcular_puntuacion_total()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Evaluación NASA TLX"
        ordering = ['-fecha_creacion']
        
class SesionGrabacionNASATLX(models.Model):
    """
    Modelo para almacenar las grabaciones de video y frames de cada evaluación NASA TLX
    """
    evaluacion = models.OneToOneField(
        EvaluacionNASATLX, 
        on_delete=models.CASCADE,
        related_name='sesion_grabacion',
        verbose_name="Evaluación NASA TLX"
    )
    usuario = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sesiones_grabacion_tlx',
        verbose_name="Usuario"
    )
    
    # Archivo de video completo
    archivo_video = models.FileField(
        upload_to='videos_nasa_tlx/%Y/%m/%d/',
        verbose_name="Video de la sesión",
        null=True,
        blank=True
    )
    nombre_video = models.CharField(
        max_length=255,
        verbose_name="Nombre del archivo de video",
        blank=True
    )
    
    # Metadatos de la grabación
    fecha_grabacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de grabación"
    )
    duracion_segundos = models.IntegerField(
        verbose_name="Duración (segundos)",
        default=120,
        help_text="Duración total de la grabación en segundos"
    )
    total_frames = models.IntegerField(
        verbose_name="Total de frames",
        default=0,
        help_text="Número total de frames capturados"
    )
    intervalo_captura = models.IntegerField(
        verbose_name="Intervalo de captura (segundos)",
        default=10,
        help_text="Intervalo en segundos entre cada frame"
    )
    
    # Estado de la grabación
    completada = models.BooleanField(
        verbose_name="Grabación completada",
        default=False
    )
    
    class Meta:
        verbose_name = "Sesión de Grabación NASA TLX"
        verbose_name_plural = "Sesiones de Grabación NASA TLX"
        ordering = ['-fecha_grabacion']
    
    def __str__(self):
        return f"Sesión NASA TLX - {self.usuario.username} - {self.fecha_grabacion.strftime('%Y-%m-%d %H:%M')}"

class FrameNASATLX(models.Model):
    """
    Modelo para almacenar cada frame capturado durante la evaluación NASA TLX
    """
    sesion = models.ForeignKey(
        SesionGrabacionNASATLX,
        on_delete=models.CASCADE,
        related_name='frames',
        verbose_name="Sesión de grabación"
    )
    
    # Imagen del frame
    imagen = models.ImageField(
        upload_to='frames_nasa_tlx/%Y/%m/%d/',
        verbose_name="Frame"
    )
    
    # Metadatos del frame
    timestamp_segundos = models.FloatField(
        verbose_name="Timestamp (segundos)",
        help_text="Momento exacto de captura en segundos desde inicio"
    )
    numero_frame = models.IntegerField(
        verbose_name="Número de frame"
    )
    fecha_captura = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de captura"
    )
    
    class Meta:
        verbose_name = "Frame NASA TLX"
        verbose_name_plural = "Frames NASA TLX"
        ordering = ['numero_frame']
        unique_together = ['sesion', 'numero_frame']  # Evitar frames duplicados
    
    def __str__(self):
        return f"Frame {self.numero_frame} - {self.sesion}"

class RegistroFisiologico(models.Model):
    """
    Registros fisiológicos (signos vitales)
    """
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='registros_fisiologicos')
    fecha = models.DateTimeField()
    
    # Signos vitales
    frecuencia_cardiaca = models.IntegerField(help_text="Latidos por minuto")
    presion_arterial_sistolica = models.IntegerField(help_text="Presión sistólica (alta)")
    presion_arterial_diastolica = models.IntegerField(help_text="Presión diastólica (baja)")
    temperatura = models.DecimalField(max_digits=4, decimal_places=1, help_text="Temperatura en °C")
    oxigenacion_sangre = models.IntegerField(help_text="SpO2 en porcentaje")
    
    # Actividad física
    pasos_diarios = models.IntegerField(default=0)
    calorias_quemadas = models.IntegerField(default=0)
    horas_sueno = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Horas de sueño (ej: 7.75 = 7 horas 45 minutos) ")
    
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
        total = (self.estres_relajado * 0 + 
             self.estres_bajo * 25 + 
             self.estres_moderado * 50 + 
             self.estres_alto * 75)
        return total // 100  # Esto dará 0-75, no 0-100
    
    def save(self, *args, **kwargs):
        # SOLO calcular si no se proporcionó explícitamente
        if self.nivel_estres is None:
            self.nivel_estres = self.calcular_nivel_estres()
        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.usuario.username} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"

class ZungAnxietyScale(models.Model):
    """
    Modelo para la Escala de Ansiedad de Zung (Self-Rating Anxiety Scale - SAS)
    """
    # Relación con el usuario
    usuario = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='pruebas_ansiedad_zung',
        verbose_name="Usuario"
    )
    
    # Fecha del registro
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de registro"
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última actualización"
    )
    
    # Preguntas de la escala (20 items)
    p01_me_siento_mas_nervioso = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Me siento más nervioso y ansioso que de costumbre"
    )
    p02_siento_miedo_sin_razon = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Siento miedo sin razón"
    )
    p03_me_siento_alterado = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Me siento alterado o agitado"
    )
    p04_siento_que_me_desmorono = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Siento que me estoy desmoronando"
    )
    p05_siento_que_todo_bien = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Siento que todo está bien y no pasará nada malo"
    )
    p06_temblor_sacudidas = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tiemblan mis manos, brazos o piernas"
    )
    p07_dolores_cabeza_cuello = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo dolores de cabeza, cuello o espalda"
    )
    p08_debilidad_fatiga = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Me siento débil y me canso fácilmente"
    )
    p09_siento_calma_tranquilidad = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Me siento calmado y puedo permanecer en calma fácilmente"
    )
    p10_siento_latidos_corazon = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Siento latidos del corazón rápidos"
    )
    p11_mareos = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo mareos o vértigo"
    )
    p12_desmayos = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Siento que me voy a desmayar"
    )
    p13_respiracion_normal = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Puedo respirar normal"
    )
    p14_entumecimiento_hormigueo = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo entumecimiento u hormigueo en dedos, manos o pies"
    )
    p15_dolores_estomacales = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo dolores de estómago o indigestión"
    )
    p16_necesidad_orinar = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo necesidad frecuente de orinar"
    )
    p17_manos_calidas_secas = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Mis manos están normalmente calientes y secas"
    )
    p18_sonrojo_bochorno = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Mi cara se sonroja y siento bochornos"
    )
    p19_duermo_bien_descanso = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Duermo bien y descanso"
    )
    p20_pesadillas = models.IntegerField(
        choices=[(1, 'Rara vez'), (2, 'Algunas veces'), (3, 'Buena parte del tiempo'), (4, 'La mayor parte del tiempo')],
        verbose_name="Tengo pesadillas"
    )
    
    # Metadatos de la escala
    puntuacion_bruta = models.IntegerField(
        verbose_name="Puntuación bruta",
        help_text="Suma total de las respuestas",
        null=True, blank=True
    )
    puntuacion_indice = models.IntegerField(
        verbose_name="Índice de Ansiedad",
        help_text="Puntuación bruta × 1.25 (escala de 25-100)",
        null=True, blank=True
    )
    nivel_ansiedad = models.CharField(
        max_length=20,
        choices=[
            ('normal', 'Dentro de lo normal (25-44)'),
            ('minima', 'Ansiedad mínima a moderada (45-59)'),
            ('marcada', 'Ansiedad marcada a severa (60-74)'),
            ('extrema', 'Ansiedad extrema (75-100)')
        ],
        verbose_name="Nivel de ansiedad",
        null=True, blank=True
    )
    observaciones = models.TextField(
        verbose_name="Observaciones",
        blank=True,
        null=True
    )
    
    # ========== NUEVOS CAMPOS PARA VIDEO ==========
    video_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Ruta del video"
    )
    video_metadata = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Metadatos del video (resolución, fps, etc.)"
    )
    video_size = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="Tamaño del video (bytes)"
    )
    video_duration = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="Duración del video (segundos)"
    )
    # ==============================================

    class Meta:
        verbose_name = "Escala de Ansiedad de Zung"
        verbose_name_plural = "Escalas de Ansiedad de Zung"
        ordering = ['-fecha_registro']
        
    def __str__(self):
        return f"Zung Anxiety - {self.usuario.username} - {self.fecha_registro.strftime('%d/%m/%Y')}"
    
    def calcular_puntuaciones(self):
        """
        Calcula las puntuaciones de la escala considerando los items inversos
        """
        # Items inversos: 5, 9, 13, 17, 19
        items_inversos = ['p05_siento_que_todo_bien', 'p09_siento_calma_tranquilidad', 
                          'p13_respiracion_normal', 'p17_manos_calidas_secas', 
                          'p19_duermo_bien_descanso']
        puntuacion_total = 0
        
        campos = [
            self.p01_me_siento_mas_nervioso,
            self.p02_siento_miedo_sin_razon,
            self.p03_me_siento_alterado,
            self.p04_siento_que_me_desmorono,
            self.p05_siento_que_todo_bien,
            self.p06_temblor_sacudidas,
            self.p07_dolores_cabeza_cuello,
            self.p08_debilidad_fatiga,
            self.p09_siento_calma_tranquilidad,
            self.p10_siento_latidos_corazon,
            self.p11_mareos,
            self.p12_desmayos,
            self.p13_respiracion_normal,
            self.p14_entumecimiento_hormigueo,
            self.p15_dolores_estomacales,
            self.p16_necesidad_orinar,
            self.p17_manos_calidas_secas,
            self.p18_sonrojo_bochorno,
            self.p19_duermo_bien_descanso,
            self.p20_pesadillas,
        ]
        
        nombres_campos = [
            'p01_me_siento_mas_nervioso', 'p02_siento_miedo_sin_razon', 'p03_me_siento_alterado',
            'p04_siento_que_me_desmorono', 'p05_siento_que_todo_bien', 'p06_temblor_sacudidas',
            'p07_dolores_cabeza_cuello', 'p08_debilidad_fatiga', 'p09_siento_calma_tranquilidad',
            'p10_siento_latidos_corazon', 'p11_mareos', 'p12_desmayos', 'p13_respiracion_normal',
            'p14_entumecimiento_hormigueo', 'p15_dolores_estomacales', 'p16_necesidad_orinar',
            'p17_manos_calidas_secas', 'p18_sonrojo_bochorno', 'p19_duermo_bien_descanso',
            'p20_pesadillas'
        ]
        
        for i, valor in enumerate(campos):
            if valor:
                if nombres_campos[i] in items_inversos:
                    # Para items inversos: 1→4, 2→3, 3→2, 4→1
                    puntuacion_total += 5 - valor
                else:
                    puntuacion_total += valor
        
        self.puntuacion_bruta = puntuacion_total
        self.puntuacion_indice = int(puntuacion_total * 1.25)
        
        # Determinar nivel de ansiedad
        if self.puntuacion_indice <= 44:
            self.nivel_ansiedad = 'normal'
        elif self.puntuacion_indice <= 59:
            self.nivel_ansiedad = 'minima'
        elif self.puntuacion_indice <= 74:
            self.nivel_ansiedad = 'marcada'
        else:
            self.nivel_ansiedad = 'extrema'
        
        return self.puntuacion_bruta, self.puntuacion_indice
    
    def save(self, *args, **kwargs):
        self.calcular_puntuaciones()
        super().save(*args, **kwargs)
        
class Mission(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre de la misión")
    habitat_type = models.CharField(max_length=50, verbose_name="Tipo de hábitat")
    duration_days = models.IntegerField(verbose_name="Duración en días")
    phases = models.JSONField(default=list, verbose_name="Fases (lista de dicts con name, start, end)")
    start_date = models.DateField(verbose_name="Fecha de inicio")
    crew_members = models.ManyToManyField(User, related_name='missions', verbose_name="Tripulantes")
    
    class Meta:
        verbose_name = "Misión"
        verbose_name_plural = "Misiones"
    
    def __str__(self):
        return self.name
    
    
    
class VideoAnalisisEstrés(models.Model):
    """Almacena resultados del análisis de estrés por video"""
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    evaluacion_nasa = models.OneToOneField(EvaluacionNASATLX, on_delete=models.CASCADE, null=True, blank=True)
    evaluacion_zung = models.OneToOneField(ZungAnxietyScale, on_delete=models.CASCADE, null=True, blank=True)
    
    fecha_analisis = models.DateTimeField(auto_now_add=True)
    
    # Resultados del análisis facial
    puntuacion_estres_facial = models.FloatField(default=0.0, help_text="0-100")
    emocion_dominante = models.CharField(max_length=50, blank=True)
    
    # Microexpresiones detectadas
    micro_sonrisa = models.FloatField(default=0.0)
    micro_ceño = models.FloatField(default=0.0)
    micro_parpadeo = models.FloatField(default=0.0)
    micro_labios = models.FloatField(default=0.0)
    micro_frente = models.FloatField(default=0.0)
    
    # Métricas temporales
    variabilidad_emocional = models.FloatField(default=0.0)
    tiempo_relajado = models.FloatField(default=0.0)
    tiempo_tension = models.FloatField(default=0.0)
    
    # Datos raw (opcional, para debug)
    datos_raw = models.JSONField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Análisis de Estrés Facial"
        verbose_name_plural = "Análisis de Estrés Facial"
    
    def __str__(self):
        return f"Estrés facial: {self.puntuacion_estres_facial} - {self.fecha_analisis}"