from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.urls import reverse
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg, Min 
from django.views.decorators.cache import never_cache
from django.utils import timezone 
from django.utils.decorators import method_decorator 
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import json, time
import csv
import os
from .models import RegistroFisiologico, RegistroPsicologico, User, PerfilPWMS
#from .consultas import *
from django.core.paginator import Paginator
from .models import ZungAnxietyScale
from .forms import ZungAnxietyScaleForm

# ====== REGISTRO DE USUARIO =====
@never_cache
def registro_usuario(request):
    """Registro de usuario completo con formulario de 2 pasos"""
    print("Vista de registro_usuario llamada (sistema unificado)")
    
    if request.user.is_authenticated:
        return redirect('PWMS:pwms_dashboard')
    
    if request.method == 'POST':
        try:
            # Obtener todos los datos del formulario de 2 pasos
            username = request.POST.get('username')
            password = request.POST.get('password')
            pin = request.POST.get('pin')
            email = request.POST.get('email', '')
            telefono = request.POST.get('telefono')
            fecha_nacimiento = request.POST.get('fecha_nacimiento')
            genero = request.POST.get('genero')
            
            print(f"Registrando usuario: {username}")
            print(f"Datos recibidos: email={email}, tel={telefono}, fecha={fecha_nacimiento}, genero={genero}")
            
            # Validaciones básicas
            if User.objects.filter(username=username).exists():
                messages.error(request, 'El usuario ya existe')
                return render(request, 'PWMS/registro.html')
            
            if len(pin) != 4 or not pin.isdigit():
                messages.error(request, 'El PIN debe tener 4 dígitos numéricos')
                return render(request, 'PWMS/registro.html')
            
            # Validar campos del perfil (si están vacíos, usar valores por defecto o requerir)
            if not telefono:
                messages.error(request, 'El teléfono es requerido')
                return render(request, 'PWMS/registro.html')
            
            if not fecha_nacimiento:
                messages.error(request, 'La fecha de nacimiento es requerida')
                return render(request, 'PWMS/registro.html')
            
            if not genero:
                messages.error(request, 'El género es requerido')
                return render(request, 'PWMS/registro.html')
            
            # Crear usuario y perfil en una transacción
            with transaction.atomic():
                # Crear usuario
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    email=email
                )
                # Asumiendo que tienes un modelo PerfilPWMS con signal que lo crea automáticamente
                # Actualizar el perfil con los datos adicionales
                if hasattr(user, 'perfil_pwms'):
                    perfil = user.perfil_pwms
                    perfil.pin = pin
                    perfil.telefono = telefono
                    perfil.fecha_nacimiento = fecha_nacimiento
                    perfil.genero = genero
                    perfil.save()
                    print(f"Perfil actualizado para {username}")
                else:
                    print(f"Advertencia: Usuario {username} no tiene perfil_pwms")
                
                print(f"Usuario {username} creado exitosamente")
                
                # Opcional: iniciar sesión automáticamente
                # login(request, user)
                # messages.success(request, f'¡Registro exitoso! Bienvenido {username}.')
                # return redirect('PWMS:pwms_dashboard')
                
                # O redirigir al login con mensaje de éxito
                messages.success(request, 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.')
                return redirect('PWMS:panel_login')
                
        except Exception as e:
            print(f"Error en registro: {str(e)}")
            messages.error(request, f'Error al registrar usuario: {str(e)}')
            return render(request, 'PWMS/registro.html')
    
    # GET request: mostrar el formulario de registro unificado
    return render(request, 'PWMS/registro.html')

# ===== LOGIN =====
@require_http_methods(["GET", "POST"])
def panel_login(request):
    """Login que previene problemas de cache"""
    
    # Verificar si viene de logout
    if request.GET.get('logout') == '1':
        messages.info(request, 'Has cerrado sesión exitosamente.')
    
    # Si ya está autenticado, redirigir al dashboard
    if request.user.is_authenticated:
        return redirect('PWMS:pwms_dashboard')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        pin = request.POST.get('pin')
        
        try:
            user = User.objects.get(username=username)
            
            if hasattr(user, 'perfil_pwms') and user.perfil_pwms.pin == pin:
                login(request, user)
                messages.success(request, f'¡Bienvenido {user.username}!')
                
                return redirect('PWMS:pwms_dashboard')
            else:
                messages.error(request, 'PIN incorrecto')
        except User.DoesNotExist:
            messages.error(request, 'Usuario no encontrado')
    
    # Renderizar con headers anti-cache
    response = render(request, 'PWMS/login.html')
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    
    return response

# ===== LOGOUT =====
def panel_logout(request):
    # Guardar info del usuario antes de logout
    username = request.user.username if request.user.is_authenticated else "Usuario"
    user_id = request.user.id if request.user.is_authenticated else None
    
    # 1. Logout de Django
    logout(request)
    
    # 2. Eliminar la sesión ACTUAL de la base de datos
    if request.session.session_key:
        try:
            from django.contrib.sessions.models import Session
            Session.objects.filter(session_key=request.session.session_key).delete()
        except:
            pass
    
    # 3. Eliminar TODAS las sesiones de ESTE usuario
    if user_id:
        try:
            # Buscar todas las sesiones activas
            from django.contrib.sessions.models import Session
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                session_data = session.get_decoded()
                if str(user_id) == session_data.get('_auth_user_id', ''):
                    session.delete()
        except:
            pass
    
    # 4. Limpiar sesión en request
    request.session.flush()
    
    # 5. Crear respuesta con headers anti-cache
    from django.http import HttpResponseRedirect
    
    # URL de login con timestamp para evitar caché
    login_url = reverse('PWMS:panel_login')
    redirect_url = f"{login_url}?t={int(time.time())}&logout=1"
    
    response = HttpResponseRedirect(redirect_url)
    
    # 6. Headers para prevenir caché
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    
    # 7. Eliminar cookies manualmente
    response.delete_cookie('sessionid')
    response.delete_cookie('sessionid', path='/pwms/')
    response.delete_cookie('csrftoken')
    response.delete_cookie('csrftoken', path='/pwms/')
    
    # 8. Mensaje
    messages.success(request, f'Sesión cerrada. Adiós {username}.')
    
    return response

# ===== DASHBOARD (SOLO SI ESTÁS LOGEADO) =====
@never_cache
@login_required
def pwms_dashboard(request):
    # Últimos 5 registros fisiológicos
    registros_fisiologicos = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha')[:5]
    # Últimos 5 registros psicológicos
    registros_psicologicos = RegistroPsicologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha')[:5]
    avg_fc = RegistroFisiologico.objects.filter(usuario=request.user).aggregate(avg=Avg('frecuencia_cardiaca'))['avg']
    
    response = render(request, 'PWMS/dashboard.html', {
        'usuario': request.user,
        'perfil': request.user.perfil_pwms,
        'registros_fisiologicos': registros_fisiologicos,
        'registros_psicologicos': registros_psicologicos,
        'promedio_fc': round(avg_fc, 1) if avg_fc else None,
    })
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    return response

# ===== VISTAS DE REGISTROS PSICOLÓGICOS =====
@never_cache
@login_required
def nuevo_registro_psicologico(request):
    """Nuevo registro psicológico - versión simple"""
    return render(request, 'PWMS/nuevo_registro_psicologico.html', {
        'titulo': 'Nuevo Registro Psicológico'
    })

# ===== REGISTROS PSICOLÓGICOS =====
@never_cache
@login_required
def historial_psicologico(request):
    """Historial de registros psicológicos con datos reales"""
    registros = RegistroPsicologico.objects.filter(usuario=request.user).order_by('-fecha')
    total_registros = registros.count()
    promedios = registros.aggregate(
        estres_promedio=Avg('nivel_estres'),
        ansiedad_promedio=Avg('nivel_ansiedad'),
        animo_promedio=Avg('estado_animo')
    )
    ultimo_registro = registros.first()
    primer_registro = registros.last()
    
    context = {
        'titulo': 'Historial Psicológico',
        'registros': registros[:50],
        'total_registros': total_registros,
        'promedios': promedios,
        'ultimo_registro': ultimo_registro,
        'primer_registro': primer_registro,
    }
    return render(request, 'PWMS/historial_psicologico.html', context)

from datetime import date, timedelta
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.db.models import Avg
from django.shortcuts import render
from .models import RegistroPsicologico, EvaluacionNASATLX, ZungAnxietyScale

@never_cache
@login_required
def historial_psic_integrado(request):
    # ----- Datos psicológicos (bienestar diario) -----
    registros = RegistroPsicologico.objects.filter(usuario=request.user).order_by('-fecha')
    promedios = registros.aggregate(
        estres_promedio=Avg('nivel_estres'),
        ansiedad_promedio=Avg('nivel_ansiedad'),
        animo_promedio=Avg('estado_animo')
    )

    # Consistencia (últimos 30 días)
    hoy = date.today()
    inicio_periodo = hoy - timedelta(days=30)
    registros_30dias = registros.filter(fecha__date__gte=inicio_periodo)
    dias_con_registro = registros_30dias.values('fecha__date').distinct().count()
    porcentaje_consistencia = (dias_con_registro / 30) * 100 if dias_con_registro else 0

    # ----- Datos NASA TLX -----
    evaluaciones = EvaluacionNASATLX.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    total_evaluaciones = evaluaciones.count()
    promedio_carga = evaluaciones.aggregate(promedio=Avg('puntuacion_total'))['promedio'] or 0

    distribucion_niveles = {
        'baja': evaluaciones.filter(puntuacion_total__lt=30).count(),
        'moderada': evaluaciones.filter(puntuacion_total__gte=30, puntuacion_total__lt=60).count(),
        'alta': evaluaciones.filter(puntuacion_total__gte=60).count(),
    }

    # ----- Datos Zung Anxiety Scale -----
    pruebas_zung = ZungAnxietyScale.objects.filter(usuario=request.user).order_by('-fecha_registro')
    total_zung = pruebas_zung.count()
    # Última prueba
    ultima_zung = pruebas_zung.first()
    # Promedio del índice de ansiedad
    promedio_indice_zung = pruebas_zung.aggregate(promedio=Avg('puntuacion_indice'))['promedio'] or 0
    # Distribución por niveles
    distribucion_zung = {
        'normal': pruebas_zung.filter(nivel_ansiedad='normal').count(),
        'minima': pruebas_zung.filter(nivel_ansiedad='minima').count(),
        'marcada': pruebas_zung.filter(nivel_ansiedad='marcada').count(),
        'extrema': pruebas_zung.filter(nivel_ansiedad='extrema').count(),
    }

    context = {
        'titulo': 'Resumen Integrado',
        # Psicológico
        'registros': registros[:50],
        'promedio_estres': promedios['estres_promedio'] or 0,
        'promedio_ansiedad': promedios['ansiedad_promedio'] or 0,
        'promedio_animo': promedios['animo_promedio'] or 0,
        'porcentaje_consistencia': round(porcentaje_consistencia, 1),
        # NASA TLX
        'evaluaciones': evaluaciones[:50],
        'total_evaluaciones': total_evaluaciones,
        'promedio_carga': round(promedio_carga, 1),
        'distribucion_niveles': distribucion_niveles,
        # Zung
        'pruebas_zung': pruebas_zung[:50],
        'total_zung': total_zung,
        'promedio_indice_zung': round(promedio_indice_zung, 1),
        'ultima_zung': ultima_zung,
        'distribucion_zung': distribucion_zung,
    }
    return render(request, 'PWMS/historial_psic_integrado.html', context)

@never_cache
@login_required
def nuevo_registro_fisiologico(request):
    """Nuevo registro fisiológico - versión simple"""
    return render(request, 'PWMS/nuevo_registro_fisiologico.html', {
        'titulo': 'Nuevo Registro Fisiológico'
    })
    
@never_cache
@login_required
def historial_fisiologico(request):
    """Historial de registros fisiológicos con estadísticas"""
    registros_qs = RegistroFisiologico.objects.filter(usuario=request.user).order_by('-fecha')
    total_registros = registros_qs.count()
    promedios = registros_qs.aggregate(
        frecuencia_cardiaca=Avg('frecuencia_cardiaca'),
        pasos_diarios=Avg('pasos_diarios'),
        nivel_estres=Avg('nivel_estres'),
        oxigenacion=Avg('oxigenacion_sangre'),
        temperatura=Avg('temperatura')
    )
    primer_registro = registros_qs.order_by('fecha').first()
    ultimo_registro = registros_qs.first()
    registros = registros_qs[:50]
    
    context = {
        'total_registros': total_registros,
        'primer_registro': primer_registro,
        'promedios': promedios,
        'ultimo_registro': ultimo_registro,
        'registros': registros,
    }
    return render(request, 'PWMS/historial_fisiologico.html', context)


# ===== ENDPOINT PARA APP ANDROID =====
@csrf_exempt
@require_POST
def healthsync_registro_fisiologico(request):
    """
    Endpoint para recibir datos fisiológicos en JSON desde la app Android
    Se guarda en RegistroFisiologico (que ya se muestra en historial_fisiologico)
    """
    try:
        print(f"\n📥 Django: Recibiendo datos fisiológicos - {timezone.now()}")
        print("-" * 60)
        
        # 1. Verificar autenticación por token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({
                'status': 'error',
                'message': 'Token de autenticación requerido (formato: Token <token>)'
            }, status=401)
        
        token_key = auth_header.split(' ')[1]
        
        # 2. Buscar usuario por token
        try:
            from rest_framework.authtoken.models import Token
            token_obj = Token.objects.get(key=token_key)
            user = token_obj.user
            print(f"   Usuario autenticado: {user.username} (ID: {user.id})")
        except Token.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Token inválido o expirado'
            }, status=401)
        
        # 3. Parsear JSON
        data = json.loads(request.body)
        print(f"   Datos recibidos de {user.username}:")
        print(f"   - Pasos: {data.get('pasos')}")
        print(f"   - Ritmo cardíaco: {data.get('ritmo_cardiaco')} BPM")
        print(f"   - Calorías: {data.get('calorias')}")
        print(f"   - Presión: {data.get('presion_sistolica')}/{data.get('presion_diastolica')}")
        print(f"   - Temperatura: {data.get('temperatura')}°C")
        print(f"   - Oxigenación: {data.get('oxigenacion')}%")
        print(f"   - Estrés: R{data.get('estres_relajado')}% B{data.get('estres_bajo')}% M{data.get('estres_moderado')}% A{data.get('estres_alto')}%")
        print(f"   - Sueño: {data.get('sueño_horas')}h (calidad: {data.get('calidad_sueño')})")
        print(f"   - Fecha: {data.get('fecha')}")
        
        # 4. Validar datos requeridos
        required_fields = ['pasos', 'ritmo_cardiaco', 'fecha']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return JsonResponse({
                'status': 'error',
                'message': f'Campos requeridos faltantes: {", ".join(missing_fields)}'
            }, status=400)
        
        # 5. Validar porcentajes de estrés sumen 100%
        porcentajes_estres = [
            data.get('estres_relajado', 0),
            data.get('estres_bajo', 0),
            data.get('estres_moderado', 0),
            data.get('estres_alto', 0)
        ]
        
        total_porcentajes = sum(porcentajes_estres)
        if total_porcentajes != 100:
            print(f"   ⚠️ Advertencia: Porcentajes de estrés suman {total_porcentajes}% (debería ser 100%)")
        
        # 6. Procesar fecha (si viene del request)
        fecha_guardar = timezone.now()
        if data.get('fecha'):
            try:
                # Intentar parsear la fecha del request
                fecha_str = data.get('fecha')
                # Asumir formato ISO o similar
                fecha_parsed = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
                fecha_guardar = timezone.make_aware(fecha_parsed, timezone.get_current_timezone())
            except Exception as e:
                print(f"   ⚠️ No se pudo parsear fecha, usando hora actual: {e}")
        
        # 7. Guardar en RegistroFisiologico
        try:
            from .models import RegistroFisiologico
            
            registro = RegistroFisiologico.objects.create(
                usuario=user,
                
                # Signos vitales
                frecuencia_cardiaca=data.get('ritmo_cardiaco', 0),
                presion_arterial_sistolica=data.get('presion_sistolica'),
                presion_arterial_diastolica=data.get('presion_diastolica'),
                temperatura=data.get('temperatura'),
                oxigenacion_sangre=data.get('oxigenacion'),
                
                # Actividad física
                pasos_diarios=data.get('pasos', 0),
                calorias_quemadas=data.get('calorias', 0),
                horas_sueno=data.get('sueño_horas'),
                
                # Porcentajes de estrés (LOS 4 CAMPOS NUEVOS)
                estres_relajado=data.get('estres_relajado', 0),
                estres_bajo=data.get('estres_bajo', 0),
                estres_moderado=data.get('estres_moderado', 0),
                estres_alto=data.get('estres_alto', 0),
                
                # Nivel de estrés calculado (se calculará automáticamente en save())
                puntuacion_sueno=data.get('calidad_sueño'),
                notas_adicionales=data.get('notas', ''),
                
                # Fecha del registro
                fecha=fecha_guardar,
                
                dispositivo_origen=data.get('dispositivo_origen', 'HealthSync Android')
            )
            
            registro_id = registro.id
            nivel_estres_calculado = registro.nivel_estres
            
            print(f"   ✅ Registro guardado exitosamente")
            print(f"   📊 ID del registro: {registro_id}")
            print(f"   🧮 Nivel de estrés calculado: {nivel_estres_calculado}")
            
        except Exception as db_error:
            print(f"   ❌ Error al guardar en base de datos: {db_error}")
            return JsonResponse({
                'status': 'error',
                'message': f'Error guardando registro: {str(db_error)}'
            }, status=500)
        
        # 8. Responder con éxito
        return JsonResponse({
            'status': 'success',
            'message': 'Registro fisiológico guardado exitosamente en historial',
            'registro_id': registro_id,
            'nivel_estres_calculado': nivel_estres_calculado,
            'fecha_registro': timezone.now().isoformat(),
            'usuario': user.username,
            'detalles': {
                'pasos': data.get('pasos'),
                'ritmo_cardiaco': data.get('ritmo_cardiaco'),
                'estres_calculado': nivel_estres_calculado,
                'sueño_horas': data.get('sueño_horas')
            }
        }, status=201)
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: JSON inválido - {e}")
        return JsonResponse({
            'status': 'error',
            'message': 'JSON inválido en la solicitud'
        }, status=400)
        
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'status': 'error',
            'message': f'Error interno del servidor: {str(e)}'
        }, status=500)


@never_cache
@login_required
def grafica_presion_arterial(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/presion_arterial.html', {
        'titulo': 'Presión Arterial'
    })

@never_cache
@login_required
def grafica_frecuencia_cardiaca(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/frecuencia_cardiaca.html', {
        'titulo': 'Frecuencia Cardíaca'
    })

@never_cache
@login_required
def grafica_temperatura(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/temperatura.html', {
        'titulo': 'Temperatura'
    })
    
@never_cache
@login_required
def grafica_pasos_actividad(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/pasos_actividad.html', {
        'titulo': 'Actividad Física'
    })

@never_cache
@login_required
def grafica_sueno(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/sueno.html', {
        'titulo': 'Patrón de Sueño'
    })

@never_cache
@login_required
def grafica_oxigenacion(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/oxigenacion.html', {
        'titulo': 'Oxigenación en Sangre'
    })

@never_cache
@login_required
def grafica_psicologico(request):
    """Gráfica simple"""
    return render(request, 'PWMS/graficas/psicologico.html', {
        'titulo': 'Estado Psicológico'
    })
    
# ===== PERFIL ===== 
@never_cache
@login_required
def perfil(request):
    perfil, created = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    context = {
        'perfil': perfil,
        'total_psicologico': 0,   # cámbialo si tienes conteos reales
        'total_fisiologico': 0,
    }

    return render(request, 'PWMS/perfil.html', context)

@never_cache
@login_required
def completar_perfil(request):

    perfil, created = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    if request.method == 'POST':

        # ===== FOTO =====
        if request.FILES.get('foto'):
            perfil.foto = request.FILES.get('foto')

        # ===== DATOS PERSONALES =====
        perfil.nombre_completo = request.POST.get('nombre_completo')
        perfil.telefono = request.POST.get('telefono')
        perfil.fecha_nacimiento = request.POST.get('fecha_nacimiento') or None
        perfil.genero = request.POST.get('genero')

        # ===== PIN =====
        pin = request.POST.get('pin')
        if pin and len(pin) == 4 and pin.isdigit():
            perfil.pin = pin
        else:
            messages.error(request, "El PIN debe tener exactamente 4 números.")
            return redirect('PWMS:completar_perfil')

        # ===== DATOS MÉDICOS =====
        perfil.grupo_sanguineo = request.POST.get('grupo_sanguineo')
        perfil.alergias = request.POST.get('alergias')
        perfil.medicamentos = request.POST.get('medicamentos')
        perfil.condiciones_medicas = request.POST.get('condiciones_medicas')

        # ===== DATOS PSICOLÓGICOS =====
        perfil.psicologo_asignado = request.POST.get('psicologo_asignado')
        perfil.motivo_consulta = request.POST.get('motivo_consulta')

        # ===== PRIVACIDAD =====
        perfil.compartir_datos_medicos = 'compartir_datos_medicos' in request.POST
        perfil.recibir_recordatorios = 'recibir_recordatorios' in request.POST

        perfil.save()

        messages.success(request, "Perfil actualizado correctamente.")
        return redirect('PWMS:perfil')

    return render(request, 'PWMS/completar_perfil.html', {
        'perfil': perfil
    })

# ===== VISTAS DE ERROR =====
def pagina_no_encontrada(request, exception):
    context = {'titulo': '404 - Página no encontrada', 'mensaje': 'La página que buscas no existe o ha sido movida.'}
    return render(request, 'PWMS/404.html', context, status=404)

def error_servidor(request):
    context = {'titulo': '500 - Error del servidor', 'mensaje': 'Ha ocurrido un error interno en el servidor. Por favor, intenta más tarde.'}
    return render(request, 'PWMS/500.html', context, status=500)

def permiso_denegado(request, exception):
    context = {'titulo': '403 - Permiso denegado', 'mensaje': 'No tienes permiso para acceder a esta página.'}
    return render(request, 'PWMS/403.html', context, status=403)

def solicitud_erronea(request, exception):
    context = {'titulo': '400 - Solicitud errónea', 'mensaje': 'La solicitud no se pudo procesar. Verifica los datos e intenta nuevamente.'}
    return render(request, 'PWMS/400.html', context, status=400)

def debug_session(request):
    """Verificar estado REAL de la sesión"""
    data = {
        'is_authenticated': request.user.is_authenticated,
        'user_id': request.user.id if request.user.is_authenticated else None,
        'username': request.user.username if request.user.is_authenticated else None,
        'session_key': request.session.session_key,
        'session_exists': request.session.exists(request.session.session_key),
        'session_data': dict(request.session),
        'cookies': dict(request.COOKIES),
        'headers': dict(request.headers),
    }
    return JsonResponse(data)

    
# ============================================
# NUEVOS ENDPOINTS PARA CSV Y OTRAS API
# ============================================
@csrf_exempt
def health_check(request):
    return JsonResponse({
        'status': 'online',
        'timestamp': timezone.now().isoformat(),
        'message': 'Django server is running'
    })
    

@csrf_exempt
@require_POST
def upload_health_csv(request):
    """
    Endpoint para recibir archivos CSV desde la app móvil
    """
    try:
        print(f"📥 Django: Recibiendo solicitud CSV - {timezone.now()}")
        
        # 1. Verificar autenticación por token
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({
                'status': 'error',
                'message': 'Token de autenticación requerido'
            }, status=401)
        
        token = auth_header.split(' ')[1]
        print(f"   Token recibido: {token[:10]}...")
        
        # 2. Verificar que viene un archivo
        if 'csv_file' not in request.FILES:
            return JsonResponse({
                'status': 'error', 
                'message': 'No se envió archivo CSV'
            }, status=400)
        
        csv_file = request.FILES['csv_file']
        print(f"   Archivo recibido: {csv_file.name} ({csv_file.size} bytes)")
        
        # 3. Crear directorio para guardar archivos
        upload_dir = 'uploads/csv_files/'
        os.makedirs(upload_dir, exist_ok=True)
        
        # 4. Guardar archivo en servidor
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"health_data_{timestamp}.csv"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, 'wb+') as destination:
            for chunk in csv_file.chunks():
                destination.write(chunk)
        
        print(f"   Archivo guardado en: {filepath}")
        
        # 5. Leer y analizar CSV
        csv_file.seek(0)  # Volver al inicio del archivo
        file_content = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(file_content))
        
        records = []
        records_processed = 0
        
        for row_num, row in enumerate(csv_reader, 1):
            try:
                # Aquí puedes procesar cada fila del CSV
                # Ejemplo: guardar en base de datos Django
                record_data = {
                    'id': row.get('id', ''),
                    'timestamp': row.get('timestamp_unix', ''),
                    'fecha_hora': row.get('fecha_hora', ''),
                    'pasos': int(row.get('pasos', 0)),
                    'ritmo_cardiaco': int(row.get('ritmo_cardiaco', 0)),
                    'estres_nivel': float(row.get('estres_nivel_calculado', 0)),
                    'estres_categoria': row.get('estres_categoria', '')
                }
                
                records.append(record_data)
                records_processed += 1
                
                # Opcional: Guardar en tu modelo Django
                # HealthRecord.objects.create(
                #     user=request.user,
                #     heart_rate=record_data['ritmo_cardiaco'],
                #     steps=record_data['pasos'],
                #     stress_level=record_data['estres_nivel'],
                #     # ... otros campos
                # )
                
            except (ValueError, KeyError) as e:
                print(f"   ⚠️ Error en fila {row_num}: {e}")
                continue
        
        print(f"   Registros procesados: {records_processed}")
        
        # 6. Responder con éxito
        return JsonResponse({
            'status': 'success',
            'message': f'CSV procesado correctamente',
            'filename': filename,
            'records_processed': records_processed,
            'total_records_in_csv': len(records),
            'server_timestamp': timezone.now().isoformat(),
            'sample_record': records[0] if records else None
        }, status=200)
        
    except Exception as e:
        print(f"❌ Error en upload_health_csv: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': f'Error procesando CSV: {str(e)}'
        }, status=500)
        
        

    """Devuelve datos en JSON (útil para depuración)"""
    registros = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha')[:20]
    
    datos = []
    for r in registros:
        datos.append({
            'fecha': r.fecha.strftime('%Y-%m-%d %H:%M'),
            'fc': r.frecuencia_cardiaca,
            'presion': f"{r.presion_arterial_sistolica}/{r.presion_arterial_diastolica}",
            'temperatura': float(r.temperatura),
            'pasos': r.pasos_diarios,
            'estres': r.nivel_estres,
            'oxigenacion': r.oxigenacion_sangre,
        })
    
    return JsonResponse({
        'usuario': request.user.username,
        'total_registros': RegistroFisiologico.objects.filter(usuario=request.user).count(),
        'datos': datos
    })
@login_required
def api_fisiologicos_ultimos(request):
    """
    Endpoint: /api/fisiologicos/ultimos/?limite=10
    Devuelve los últimos N registros fisiológicos
    """
    try:
        limite = int(request.GET.get('limite', 10))
        registros = RegistroFisiologico.objects.filter(
            usuario=request.user
        ).order_by('-fecha')[:limite]
        
        data = []
        for r in registros:
            data.append({
                'id': r.id,
                'fecha': r.fecha.strftime('%Y-%m-%d %H:%M:%S'),
                'frecuencia_cardiaca': r.frecuencia_cardiaca,
                'presion_sistolica': r.presion_arterial_sistolica,
                'presion_diastolica': r.presion_arterial_diastolica,
                'presion': f"{r.presion_arterial_sistolica}/{r.presion_arterial_diastolica}",
                'temperatura': float(r.temperatura),
                'oxigenacion': r.oxigenacion_sangre,
                'pasos': r.pasos_diarios,
                'nivel_estres': r.nivel_estres,
            })
        
        return JsonResponse({'status': 'success', 'data': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_estadisticas(request):
    """
    Endpoint: /api/fisiologicos/estadisticas/?dias=7
    """
    try:
        dias = int(request.GET.get('dias', 7))
        fecha_limite = timezone.now() - timedelta(days=dias)
        
        registros = RegistroFisiologico.objects.filter(
            usuario=request.user,
            fecha__gte=fecha_limite
        )
        
        total = registros.count()
        if total == 0:
            return JsonResponse({'status': 'success', 'data': None})
        
        promedios = registros.aggregate(
            fc_promedio=Avg('frecuencia_cardiaca'),
            sis_promedio=Avg('presion_arterial_sistolica'),
            dia_promedio=Avg('presion_arterial_diastolica'),
            temp_promedio=Avg('temperatura'),
            spo2_promedio=Avg('oxigenacion_sangre'),
            estres_promedio=Avg('nivel_estres'),
        )
        
        for key in promedios:
            if promedios[key]:
                promedios[key] = round(promedios[key], 1)
        
        return JsonResponse({
            'status': 'success',
            'total_registros': total,
            'promedios': promedios
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_tendencia(request):
    """
    Endpoint: /api/fisiologicos/tendencia/?dias=7&variable=fc
    """
    try:
        dias = int(request.GET.get('dias', 7))
        variable = request.GET.get('variable', 'fc')
        fecha_limite = timezone.now() - timedelta(days=dias)
        
        registros = RegistroFisiologico.objects.filter(
            usuario=request.user,
            fecha__gte=fecha_limite
        ).order_by('fecha')
        
        mapa = {
            'fc': 'frecuencia_cardiaca',
            'presion': 'presion_arterial_sistolica',
            'temperatura': 'temperatura',
            'spo2': 'oxigenacion_sangre',
            'estres': 'nivel_estres'
        }
        
        campo = mapa.get(variable, 'frecuencia_cardiaca')
        
        data = []
        fechas = []
        for r in registros:
            valor = getattr(r, campo)
            if campo == 'temperatura':
                valor = float(valor)
            data.append({'fecha': r.fecha.strftime('%Y-%m-%d %H:%M'), 'valor': valor})
            fechas.append(r.fecha.strftime('%d/%m %H:%M'))
        
        return JsonResponse({
            'status': 'success',
            'total_puntos': len(data),
            'fechas': fechas,
            'data': data
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_por_fecha(request):
    """
    Endpoint: /api/fisiologicos/por-fecha/?fecha=2024-02-16
    """
    try:
        fecha_str = request.GET.get('fecha')
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        
        registros = RegistroFisiologico.objects.filter(
            usuario=request.user,
            fecha__date=fecha
        ).order_by('fecha')
        
        data = []
        for r in registros:
            data.append({
                'hora': r.fecha.strftime('%H:%M'),
                'fc': r.frecuencia_cardiaca,
                'presion': f"{r.presion_arterial_sistolica}/{r.presion_arterial_diastolica}",
                'temp': float(r.temperatura),
                'spo2': r.oxigenacion_sangre,
                'estres': r.nivel_estres,
            })
        
        return JsonResponse({'status': 'success', 'total_registros': len(data), 'data': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_ultimo_vivo(request):
    """
    Endpoint: /api/fisiologicos/ultimo-vivo/
    """
    try:
        ultimo = RegistroFisiologico.objects.filter(
            usuario=request.user
        ).order_by('-fecha').first()
        
        if not ultimo:
            return JsonResponse({'status': 'success', 'hay_datos': False})
        
        return JsonResponse({
            'status': 'success',
            'hay_datos': True,
            'fecha': ultimo.fecha.strftime('%Y-%m-%d %H:%M:%S'),
            'frecuencia_cardiaca': ultimo.frecuencia_cardiaca,
            'presion': f"{ultimo.presion_arterial_sistolica}/{ultimo.presion_arterial_diastolica}",
            'temperatura': float(ultimo.temperatura),
            'oxigenacion': ultimo.oxigenacion_sangre,
            'nivel_estres': ultimo.nivel_estres,
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
# ============================================
# ENDPOINTS PARA ML - SOLO DATOS CRUDOS
# ============================================

@login_required
def api_ml_datos_fisiologicos(request):
    """SOLO DATOS CRUDOS - Sin procesamiento"""
    try:
        queryset = RegistroFisiologico.objects.filter(usuario=request.user)
        
        # Filtros opcionales
        desde = request.GET.get('desde')
        hasta = request.GET.get('hasta')
        limite = int(request.GET.get('limite', 1000))
        
        if desde:
            queryset = queryset.filter(fecha__gte=datetime.strptime(desde, '%Y-%m-%d'))
        if hasta:
            queryset = queryset.filter(fecha__lte=datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1))
        
        registros = queryset.order_by('fecha')[:limite]
        
        data = []
        for r in registros:
            data.append({
                'id': r.id,
                'fecha_unix': int(r.fecha.timestamp()),
                'frecuencia_cardiaca': r.frecuencia_cardiaca,
                'presion_sistolica': r.presion_arterial_sistolica,
                'presion_diastolica': r.presion_arterial_diastolica,
                'temperatura': float(r.temperatura),
                'oxigenacion': r.oxigenacion_sangre,
                'pasos': r.pasos_diarios,
                'estres_relajado': r.estres_relajado,
                'estres_bajo': r.estres_bajo,
                'estres_moderado': r.estres_moderado,
                'estres_alto': r.estres_alto,
            })
        
        return JsonResponse({'data': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def api_ml_datos_psicologicos(request):
    """SOLO DATOS CRUDOS - Sin procesamiento"""
    try:
        queryset = RegistroPsicologico.objects.filter(usuario=request.user)
        
        desde = request.GET.get('desde')
        hasta = request.GET.get('hasta')
        limite = int(request.GET.get('limite', 1000))
        
        if desde:
            queryset = queryset.filter(fecha__gte=datetime.strptime(desde, '%Y-%m-%d'))
        if hasta:
            queryset = queryset.filter(fecha__lte=datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1))
        
        registros = queryset.order_by('fecha')[:limite]
        
        data = []
        for r in registros:
            data.append({
                'id': r.id,
                'fecha_unix': int(r.fecha.timestamp()),
                'nivel_estres': r.nivel_estres,
                'nivel_ansiedad': r.nivel_ansiedad,
                'estado_animo': r.estado_animo,
            })
        
        return JsonResponse({'data': data})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
@login_required
def zung_anxiety_nuevo(request):
    """
    Vista para crear un nuevo registro de la Escala de Ansiedad de Zung
    """
    if request.method == 'POST':
        form = ZungAnxietyScaleForm(request.POST)
        if form.is_valid():
            prueba = form.save(commit=False)
            prueba.usuario = request.user
            prueba.save()
            messages.success(request, '✅ Evaluación de Ansiedad de Zung guardada exitosamente.')
            return redirect('PWMS:zung_anxiety_resultados', pk=prueba.pk)
    else:
        form = ZungAnxietyScaleForm()
    
    return render(request, 'PWMS/zung_anxiety_form.html', {
        'form': form,
        'titulo': 'Nueva Evaluación'
    })

@login_required
def zung_anxiety_resultados(request, pk):
    """
    Vista para ver los resultados de una evaluación específica
    """
    prueba = get_object_or_404(ZungAnxietyScale, pk=pk, usuario=request.user)
    
    # Calcular conteo de respuestas para las tarjetas de resumen
    respuestas = [
        prueba.p01_me_siento_mas_nervioso,
        prueba.p02_siento_miedo_sin_razon,
        prueba.p03_me_siento_alterado,
        prueba.p04_siento_que_me_desmorono,
        prueba.p05_siento_que_todo_bien,
        prueba.p06_temblor_sacudidas,
        prueba.p07_dolores_cabeza_cuello,
        prueba.p08_debilidad_fatiga,
        prueba.p09_siento_calma_tranquilidad,
        prueba.p10_siento_latidos_corazon,
        prueba.p11_mareos,
        prueba.p12_desmayos,
        prueba.p13_respiracion_normal,
        prueba.p14_entumecimiento_hormigueo,
        prueba.p15_dolores_estomacales,
        prueba.p16_necesidad_orinar,
        prueba.p17_manos_calidas_secas,
        prueba.p18_sonrojo_bochorno,
        prueba.p19_duermo_bien_descanso,
        prueba.p20_pesadillas,
    ]
    
    conteo_r1 = respuestas.count(1)
    conteo_r2 = respuestas.count(2)
    conteo_r3 = respuestas.count(3)
    conteo_r4 = respuestas.count(4)
    
    return render(request, 'PWMS/zung_anxiety_resultados.html', {
        'prueba': prueba,
        'conteo_r1': conteo_r1,
        'conteo_r2': conteo_r2,
        'conteo_r3': conteo_r3,
        'conteo_r4': conteo_r4,
    })

@login_required
def zung_anxiety_historial(request):
    """
    Vista para ver el historial de evaluaciones del usuario con filtros
    """
    pruebas = ZungAnxietyScale.objects.filter(usuario=request.user)
    
    # Aplicar filtros si existen
    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    nivel = request.GET.get('nivel')
    
    if fecha_desde:
        pruebas = pruebas.filter(fecha_registro__date__gte=fecha_desde)
    if fecha_hasta:
        pruebas = pruebas.filter(fecha_registro__date__lte=fecha_hasta)
    if nivel:
        pruebas = pruebas.filter(nivel_ansiedad=nivel)
    
    # Ordenar por fecha descendente
    pruebas = pruebas.order_by('-fecha_registro')
    
    # Calcular estadísticas para las tarjetas de resumen
    total_evaluaciones = pruebas.count()
    
    # Último índice
    ultima_prueba = pruebas.first()
    ultimo_indice = ultima_prueba.puntuacion_indice if ultima_prueba else None
    
    # Promedio general
    promedio_indice = pruebas.aggregate(Avg('puntuacion_indice'))['puntuacion_indice__avg']
    
    # Calcular tendencia (comparando últimos 2 registros)
    tendencia = 'estable'
    if pruebas.count() >= 2:
        ultimos_dos = list(pruebas[:2])
        if ultimos_dos[0].puntuacion_indice < ultimos_dos[1].puntuacion_indice:
            tendencia = 'mejorando'  # Disminuyó la ansiedad
        elif ultimos_dos[0].puntuacion_indice > ultimos_dos[1].puntuacion_indice:
            tendencia = 'empeorando'  # Aumentó la ansiedad
    
    # Paginación
    paginator = Paginator(pruebas, 10)  # 10 items por página
    page = request.GET.get('page')
    pruebas_page = paginator.get_page(page)
    
    return render(request, 'PWMS/zung_anxiety_historial.html', {
        'pruebas': pruebas_page,
        'paginator': paginator,
        'total_evaluaciones': total_evaluaciones,
        'ultimo_indice': ultimo_indice,
        'promedio_indice': promedio_indice,
        'tendencia': tendencia,
        'filtros_aplicados': bool(fecha_desde or fecha_hasta or nivel)
    })

# Exportar funciones para usar en urls.py
__all__ = [
    'zung_anxiety_nuevo',
    'zung_anxiety_resultados',
    'zung_anxiety_historial',
]