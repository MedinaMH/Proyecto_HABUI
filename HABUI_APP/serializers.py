# HABUI_APP/serializers.py
from rest_framework import serializers
from .models import RecursoAgua

class RecursoAguaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAgua
        fields = ['id', 'recurso', 'nivel', 'ph', 'fecha_hora']
