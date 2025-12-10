from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

# Create your models here.

class Recurso(models.Model):
    TIPO_RECURSO = [
        ('energia', 'Energia'),
        ('agua', 'Agua'),
        ('oxigeno', 'Oxigeno'),
        ('co2', 'CO2'),
        ('temperatura', 'Temperatura'),
        ('humedad', 'Humedad'),
        ('alimentos', 'Alimentos'),
        ('temperatura_alimentos', 'Temperatura_Alimentos'),
    ]
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=35, choices=TIPO_RECURSO)

# ENERGÍA
class RecursoEnergia(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'energia'})
    voltaje = models.FloatField()
    corriente = models.FloatField()
    potencia = models.FloatField()
    factor_potencia = models.FloatField(null=True, blank=True)
    frecuencia = models.FloatField(null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

# AGUA
class RecursoAgua(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'agua'})
    nivel = models.FloatField()
    fecha_hora = models.DateTimeField(auto_now_add=True)

# OXÍGENO
class RecursoOxigeno(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'oxigeno'})
    nivel = models.FloatField(help_text="Concentración de O₂ en %")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# DIÓXIDO DE CARBONO
class RecursoCO2(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'co2'})
    concentracion = models.FloatField(help_text="Concentración de CO₂ en ppm")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# TEMPERATURA
class RecursoTemperatura(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'temperatura'})
    valor = models.FloatField(help_text="Temperatura en °C")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# HUMEDAD
class RecursoHumedad(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'humedad'})
    valor = models.FloatField(help_text="Humedad relativa (%)")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# ALIMENTOS
class RecursoAlimentos(models.Model):
    recurso = models.OneToOneField(Recurso, on_delete=models.CASCADE, related_name='alimentos')
    # Porciones totales al inicio de la misión
    porciones_iniciales = models.PositiveIntegerField()
    # Porciones actualmente disponibles (irán disminuyendo)
    porciones_actuales = models.PositiveIntegerField()
    fecha_registro = models.DateTimeField(auto_now_add=True)

# ALIMENTOS
class RecursoAlimentos(models.Model):
    recurso = models.OneToOneField(Recurso, on_delete=models.CASCADE, related_name='alimentos')
    # Porciones totales al inicio de la misión
    porciones_iniciales = models.PositiveIntegerField(default=112, validators=[MinValueValidator(1)])
    # Porciones actualmente disponibles (irán disminuyendo)
    porciones_actuales = models.PositiveIntegerField(default=112, validators=[MinValueValidator(0)])
    # Configuración de la misión
    num_tripulantes = models.PositiveIntegerField(default=4, validators=[MinValueValidator(1), MaxValueValidator(6)])
    porciones_por_persona_dia = models.PositiveIntegerField(default=4, validators=[MinValueValidator(1), MaxValueValidator(4)])
    duracion_mision_dias = models.PositiveIntegerField(default=7, validators=[MinValueValidator(1), MaxValueValidator(7)])
    fecha_registro = models.DateTimeField(auto_now_add=True)

class ConsumoAlimentos(models.Model):
    """
    Registro histórico de cada consumo de alimentos
    """
    TIPO_COMIDA_CHOICES = [
        ('desayuno', 'Desayuno'),
        ('almuerzo', 'Almuerzo'),
        ('comida', 'Comida'),
        ('cena', 'Cena'),
    ]
    recurso_alimentos = models.ForeignKey(RecursoAlimentos, on_delete=models.CASCADE, related_name='consumos')
    tipo_comida = models.CharField(max_length=20, choices=TIPO_COMIDA_CHOICES)
    personas = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    porciones = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    fecha_registro = models.DateTimeField(auto_now_add=True)

class TemperaturaAlimentos(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'temperatura_alimentos'})
    valor = models.FloatField(help_text="Temperatura en °C")
    fecha_hora = models.DateTimeField(auto_now_add=True)