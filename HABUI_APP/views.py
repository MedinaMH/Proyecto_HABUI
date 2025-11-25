from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import RecursoAguaSerializer
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
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

#----------recurso agua-----------------
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
#-------------------------------

def panel_oxigeno_rems(request):
    return render(request, 'REMS/panel_oxigeno.html')

def panel_co2(request):
    return render(request, 'REMS/panel_CO2.html')

def panel_alimentos_rems(request):
    return render(request, 'REMS/panel_alimentos.html')

def panel_temperatura_rems(request):
    return render(request, 'REMS/panel_temperatura.html')

def panel_humedad_rems(request):
    return render(request, 'REMS/panel_humedad.html')