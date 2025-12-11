from django.shortcuts import render

# Create your views here.

def panel_login(request):
    return render(request, 'login.html')