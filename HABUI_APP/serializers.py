# HABUI_APP/serializers.py
from rest_framework import serializers
from .models import RecursoAgua, RecursoAlimentos, ConsumoAlimentos

class RecursoAguaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAgua
        fields = ['id', 'recurso', 'nivel', 'fecha_hora']

class ConsumoAlimentosSerializer(serializers.ModelSerializer):
    tipo_comida_display = serializers.CharField(source='get_tipo_comida_display', read_only=True)
    
    class Meta:
        model = ConsumoAlimentos
        fields = ['id', 'recurso_alimentos', 'tipo_comida', 'tipo_comida_display', 
                'personas', 'porciones', 'fecha_registro']

class RecursoAlimentosSerializer(serializers.ModelSerializer):
    consumos = ConsumoAlimentosSerializer(many=True, read_only=True)
    porcentaje_restante = serializers.SerializerMethodField()
    dias_autonomia = serializers.SerializerMethodField()
    consumo_diario_estimado = serializers.SerializerMethodField()
    
    class Meta:
        model = RecursoAlimentos
        fields = ['id', 'recurso', 'porciones_iniciales', 'porciones_actuales',
                'num_tripulantes', 'porciones_por_persona_dia', 'duracion_mision_dias',
                'fecha_registro', 'consumos', 'porcentaje_restante', 
                'dias_autonomia', 'consumo_diario_estimado']
    
    def get_porcentaje_restante(self, obj):
        if obj.porciones_iniciales > 0:
            return round((obj.porciones_actuales / obj.porciones_iniciales) * 100, 1)
        return 0
    
    def get_dias_autonomia(self, obj):
        consumo_diario = obj.num_tripulantes * obj.porciones_por_persona_dia
        if consumo_diario > 0:
            return max(0, obj.porciones_actuales // consumo_diario)
        return 0
    
    def get_consumo_diario_estimado(self, obj):
        return obj.num_tripulantes * obj.porciones_por_persona_dia