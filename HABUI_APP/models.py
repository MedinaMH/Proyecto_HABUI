from django.db import models

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
    ]
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_RECURSO)

# ⚡ ENERGÍA
class RecursoEnergia(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'energia'})
    voltaje = models.FloatField()
    corriente = models.FloatField()
    potencia = models.FloatField()
    factor_potencia = models.FloatField(null=True, blank=True)
    frecuencia = models.FloatField(null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 💧 AGUA
class RecursoAgua(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'agua'})
    nivel = models.FloatField()
    ph = models.FloatField(null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 🌿 OXÍGENO
class RecursoOxigeno(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'oxigeno'})
    nivel = models.FloatField(help_text="Concentración de O₂ en %")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 🌫️ DIÓXIDO DE CARBONO
class RecursoCO2(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'co2'})
    concentracion = models.FloatField(help_text="Concentración de CO₂ en ppm")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 🌡️ TEMPERATURA
class RecursoTemperatura(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'temperatura'})
    valor = models.FloatField(help_text="Temperatura en °C")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 💧 HUMEDAD
class RecursoHumedad(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'humedad'})
    valor = models.FloatField(help_text="Humedad relativa (%)")
    fecha_hora = models.DateTimeField(auto_now_add=True)

# 🥫 ALIMENTOS
class RecursoAlimentos(models.Model):
    recurso = models.OneToOneField(Recurso, on_delete=models.CASCADE, related_name='alimentos')
    nombre = models.CharField(max_length=100)
    cantidad_kg = models.FloatField()
    fecha_caducidad = models.DateField()
    fecha_registro = models.DateTimeField(auto_now_add=True)

