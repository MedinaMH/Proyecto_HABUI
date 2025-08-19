from django.db import models

# Create your models here.

class Recurso(models.Model):
    TIPO_RECURSO = [
        ('agua', 'Agua'),
        ('energia', 'Energia'),
        ('oxigeno', 'Oxigeno'),
        ('alimentos', 'Alimentos'),
    ]
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_RECURSO)

class RecursoAgua(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'agua'})
    nivel = models.FloatField()
    ph = models.FloatField(null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

class RecursoEnergia(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'energia'})
    voltaje = models.FloatField()
    corriente = models.FloatField()
    potencia = models.FloatField()
    factor_potencia = models.FloatField(null=True, blank=True)
    frecuencia = models.FloatField(null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)

class RecursoOxigeno(models.Model):
    recurso = models.ForeignKey(Recurso, on_delete=models.CASCADE, limit_choices_to={'tipo': 'oxigeno'})
    nivel = models.FloatField()
    fecha_hora = models.DateTimeField(auto_now_add=True)

class RecursoAlimentos(models.Model):
    recurso = models.OneToOneField(Recurso, on_delete=models.CASCADE, related_name='alimentos')
    nombre = models.CharField(max_length=100)
    cantidad_kg = models.FloatField()
    fecha_caducidad = models.DateField()
    fecha_registro = models.DateTimeField(auto_now_add=True)

