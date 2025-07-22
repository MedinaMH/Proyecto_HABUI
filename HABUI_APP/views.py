from django.shortcuts import render
from django.http import HttpResponse

# Create your views here.


def panel_principal(request):
    return render(request, 'panel_principal.html')

def panel_energia_rems(request):
    return render(request, 'REMS/panel_energia.html')

def panel_agua_rems(request):
    return render(request, 'REMS/panel_agua.html')

def panel_oxigeno_rems(request):
    return render(request, 'REMS/panel_oxigeno.html')

def panel_alimentos_rems(request):
    return render(request, 'REMS/panel_alimentos.html')

def panel_all_resources(request):
    return render(request, 'REMS/all_resources.html')