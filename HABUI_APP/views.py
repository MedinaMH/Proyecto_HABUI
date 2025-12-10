from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import RecursoAguaSerializer, RecursoAlimentosSerializer, ConsumoAlimentosSerializer
from .models import RecursoAlimentos, ConsumoAlimentos
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
# from .utils.data_simulator import DataSimulator
import altair as alt
import pandas as pd
import plotly.express as px
# import json
from .models import RecursoAgua
# Create your views here.

def panel_principal(request):
    return render(request, 'panel_principal.html')

def panel_all_resources(request):
    return render(request, 'REMS/all_resources.html')

def panel_energia_rems(request):
    return render(request, 'REMS/panel_energia.html')

#----------Recurso agua-----------------
def panel_agua_rems(request, recurso_id=None):
    contexto = {'recurso_id': recurso_id or ''}
    return render(request, 'REMS/panel_agua.html', contexto)

@api_view(['GET'])
def api_agua_unity(request):
    datos = RecursoAgua.objects.all().order_by('-fecha_hora')[:50]
    serializer = RecursoAguaSerializer(datos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def api_agua_post(request):
    serializer = RecursoAguaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
#---------Fin recurso agua-----------------

def panel_oxigeno_rems(request):
    return render(request, 'REMS/panel_oxigeno.html')

def panel_co2(request):
    return render(request, 'REMS/panel_CO2.html')

# ----------recurso alimentos-----------------
def panel_alimentos_rems(request, recurso_id=None):
    contexto = {'recurso_id': recurso_id or ''}
    return render(request, 'REMS/panel_alimentos.html', contexto)

@api_view(['GET'])
def api_alimentos_estado(request):
    """
    Obtiene el estado actual de los alimentos
    """
    try:
        recurso_alimentos = RecursoAlimentos.objects.first()
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def api_alimentos_consumos_recientes(request):
    """
    Obtiene los consumos más recientes
    """
    try:
        consumos = ConsumoAlimentos.objects.all().order_by('-fecha_registro')[:50]
        serializer = ConsumoAlimentosSerializer(consumos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def api_alimentos_consumos_diarios(request):
    """
    Obtiene el resumen de consumo del día actual
    """
    try:
        hoy = timezone.now().date()
        consumos_hoy = ConsumoAlimentos.objects.filter(fecha_registro__date=hoy)
        
        # Calcular resumen por tipo de comida
        resumen = {
            'desayuno': {'porciones': 0, 'personas': 0},
            'almuerzo': {'porciones': 0, 'personas': 0},
            'comida': {'porciones': 0, 'personas': 0},
            'cena': {'porciones': 0, 'personas': 0},
            'total_porciones': 0,
            'total_personas': 0
        }
        
        for consumo in consumos_hoy:
            tipo = consumo.tipo_comida
            if tipo in resumen:
                resumen[tipo]['porciones'] += consumo.porciones
                resumen[tipo]['personas'] += consumo.personas
                resumen['total_porciones'] += consumo.porciones
                resumen['total_personas'] += consumo.personas
        
        return Response({
            'fecha': hoy.isoformat(),
            'resumen': resumen,
            'detalles': ConsumoAlimentosSerializer(consumos_hoy, many=True).data
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def api_alimentos_registrar_consumo(request):
    """
    Registra un nuevo consumo de alimentos y actualiza las porciones disponibles
    """
    try:
        data = request.data
        
        # Validar datos requeridos
        tipo_comida = data.get('tipo_comida')
        personas = data.get('personas')
        porciones = data.get('porciones')
        
        if not tipo_comida or tipo_comida not in ['desayuno', 'almuerzo', 'comida', 'cena']:
            return Response(
                {'error': 'Tipo de comida inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not personas or int(personas) <= 0:
            return Response(
                {'error': 'Número de personas inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not porciones or int(porciones) <= 0:
            return Response(
                {'error': 'Número de porciones inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        personas = int(personas)
        porciones = int(porciones)
        
        # Usar transacción atómica para evitar inconsistencias
        with transaction.atomic():
            # Obtener recurso de alimentos (bloquear para evitar condiciones de carrera)
            recurso_alimentos = RecursoAlimentos.objects.select_for_update().first()
            
            if not recurso_alimentos:
                return Response(
                    {'error': 'No se encontró recurso de alimentos'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar si hay suficientes porciones
            if porciones > recurso_alimentos.porciones_actuales:
                return Response({
                    'error': f'No hay suficientes porciones. Disponibles: {recurso_alimentos.porciones_actuales}',
                    'porciones_disponibles': recurso_alimentos.porciones_actuales
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 1. Crear registro del consumo
            consumo = ConsumoAlimentos.objects.create(
                recurso_alimentos=recurso_alimentos,
                tipo_comida=tipo_comida,
                personas=personas,
                porciones=porciones
            )
            
            # 2. Actualizar porciones disponibles
            recurso_alimentos.porciones_actuales -= porciones
            recurso_alimentos.save()
        
        # Serializar respuesta
        consumo_serializer = ConsumoAlimentosSerializer(consumo)
        recurso_serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Consumo registrado: {porciones} porciones en {tipo_comida}',
            'consumo': consumo_serializer.data,
            'recurso_alimentos': recurso_serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def api_alimentos_reset(request):
    """
    Resetea las porciones disponibles a su valor inicial
    """
    try:
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Resetear porciones
        recurso_alimentos.porciones_actuales = recurso_alimentos.porciones_iniciales
        recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Porciones reseteadas a {recurso_alimentos.porciones_actuales}',
            'data': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
#----------------Fin recurso alimentos----------------------------

def panel_temperatura_rems(request):
    return render(request, 'REMS/panel_temperatura.html')

def panel_humedad_rems(request):
    return render(request, 'REMS/panel_humedad.html')