from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
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
import shutil
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import RegistroFisiologico, RegistroPsicologico, User, PerfilPWMS
from .models import ZungAnxietyScale, EvaluacionNASATLX
from .forms import NASATLXForm, ZungAnxietyScaleForm
from django.core.paginator import Paginator
from datetime import date, timedelta
#from .stress_detection.face_analyzer import FaceAnalyzer

# ====== REGISTRO DE USUARIO =====
@never_cache
def registro_usuario(request):
    """Registro de usuario completo con formulario de 2 pasos"""
    print("Vista de registro_usuario llamada (sistema unificado)")
    
    if request.user.is_authenticated:
        return redirect('PWMS:pwms_dashboard')
    
    if request.method == 'POST':
        try:
            username = request.POST.get('username')
            password = request.POST.get('password')
            pin = request.POST.get('pin')
            email = request.POST.get('email', '')
            telefono = request.POST.get('telefono')
            fecha_nacimiento = request.POST.get('fecha_nacimiento')
            genero = request.POST.get('genero')
            
            if User.objects.filter(username=username).exists():
                messages.error(request, 'El usuario ya existe')
                return render(request, 'PWMS/registro.html')
            
            if len(pin) != 4 or not pin.isdigit():
                messages.error(request, 'El PIN debe tener 4 dígitos numéricos')
                return render(request, 'PWMS/registro.html')
            
            if not telefono:
                messages.error(request, 'El teléfono es requerido')
                return render(request, 'PWMS/registro.html')
            if not fecha_nacimiento:
                messages.error(request, 'La fecha de nacimiento es requerida')
                return render(request, 'PWMS/registro.html')
            if not genero:
                messages.error(request, 'El género es requerido')
                return render(request, 'PWMS/registro.html')
            
            with transaction.atomic():
                user = User.objects.create_user(username=username, password=password, email=email)
                if hasattr(user, 'perfil_pwms'):
                    perfil = user.perfil_pwms
                    perfil.pin = pin
                    perfil.telefono = telefono
                    perfil.fecha_nacimiento = fecha_nacimiento
                    perfil.genero = genero
                    perfil.save()
                messages.success(request, 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.')
                return redirect('PWMS:panel_login')
        except Exception as e:
            print(f"Error en registro: {str(e)}")
            messages.error(request, f'Error al registrar usuario: {str(e)}')
            return render(request, 'PWMS/registro.html')
    
    return render(request, 'PWMS/registro.html')

# ===== LOGIN =====
@require_http_methods(["GET", "POST"])
def panel_login(request):
    """Login que previene problemas de cache"""
    if request.GET.get('logout') == '1':
        messages.info(request, 'Has cerrado sesión exitosamente.')
    
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
    
    response = render(request, 'PWMS/login.html')
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    return response

# ===== LOGOUT =====
def panel_logout(request):
    username = request.user.username if request.user.is_authenticated else "Usuario"
    user_id = request.user.id if request.user.is_authenticated else None
    
    logout(request)
    
    if request.session.session_key:
        try:
            from django.contrib.sessions.models import Session
            Session.objects.filter(session_key=request.session.session_key).delete()
        except:
            pass
    
    if user_id:
        try:
            from django.contrib.sessions.models import Session
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                session_data = session.get_decoded()
                if str(user_id) == session_data.get('_auth_user_id', ''):
                    session.delete()
        except:
            pass
    
    request.session.flush()
    
    from django.http import HttpResponseRedirect
    login_url = reverse('PWMS:panel_login')
    redirect_url = f"{login_url}?t={int(time.time())}&logout=1"
    response = HttpResponseRedirect(redirect_url)
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    response.delete_cookie('sessionid')
    response.delete_cookie('sessionid', path='/pwms/')
    response.delete_cookie('csrftoken')
    response.delete_cookie('csrftoken', path='/pwms/')
    messages.success(request, f'Sesión cerrada. Adiós {username}.')
    return response

# ===== DASHBOARD =====
@never_cache
@login_required
def pwms_dashboard(request):
    registros_fisiologicos = RegistroFisiologico.objects.filter(usuario=request.user).order_by('-fecha')[:5]
    registros_psicologicos = RegistroPsicologico.objects.filter(usuario=request.user).order_by('-fecha')[:5]
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

# ===== REGISTROS PSICOLÓGICOS =====
@never_cache
@login_required
def nuevo_registro_psicologico(request):
    return render(request, 'PWMS/nuevo_registro_psicologico.html', {'titulo': 'Nuevo Registro Psicológico'})

@never_cache
@login_required
def historial_psicologico(request):
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

@never_cache
@login_required
def historial_psic_integrado(request):
    registros = RegistroPsicologico.objects.filter(usuario=request.user).order_by('-fecha')
    promedios = registros.aggregate(
        estres_promedio=Avg('nivel_estres'),
        ansiedad_promedio=Avg('nivel_ansiedad'),
        animo_promedio=Avg('estado_animo')
    )
    hoy = date.today()
    inicio_periodo = hoy - timedelta(days=30)
    registros_30dias = registros.filter(fecha__date__gte=inicio_periodo)
    dias_con_registro = registros_30dias.values('fecha__date').distinct().count()
    porcentaje_consistencia = (dias_con_registro / 30) * 100 if dias_con_registro else 0

    evaluaciones = EvaluacionNASATLX.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    total_evaluaciones = evaluaciones.count()
    promedio_carga = evaluaciones.aggregate(promedio=Avg('puntuacion_total'))['promedio'] or 0
    distribucion_niveles = {
        'baja': evaluaciones.filter(puntuacion_total__lt=30).count(),
        'moderada': evaluaciones.filter(puntuacion_total__gte=30, puntuacion_total__lt=60).count(),
        'alta': evaluaciones.filter(puntuacion_total__gte=60).count(),
    }

    pruebas_zung = ZungAnxietyScale.objects.filter(usuario=request.user).order_by('-fecha_registro')
    total_zung = pruebas_zung.count()
    ultima_zung = pruebas_zung.first()
    promedio_indice_zung = pruebas_zung.aggregate(promedio=Avg('puntuacion_indice'))['promedio'] or 0
    distribucion_zung = {
        'normal': pruebas_zung.filter(nivel_ansiedad='normal').count(),
        'minima': pruebas_zung.filter(nivel_ansiedad='minima').count(),
        'marcada': pruebas_zung.filter(nivel_ansiedad='marcada').count(),
        'extrema': pruebas_zung.filter(nivel_ansiedad='extrema').count(),
    }

    context = {
        'titulo': 'Resumen Integrado',
        'registros': registros[:50],
        'promedio_estres': promedios['estres_promedio'] or 0,
        'promedio_ansiedad': promedios['ansiedad_promedio'] or 0,
        'promedio_animo': promedios['animo_promedio'] or 0,
        'porcentaje_consistencia': round(porcentaje_consistencia, 1),
        'evaluaciones': evaluaciones[:50],
        'total_evaluaciones': total_evaluaciones,
        'promedio_carga': round(promedio_carga, 1),
        'distribucion_niveles': distribucion_niveles,
        'pruebas_zung': pruebas_zung[:50],
        'total_zung': total_zung,
        'promedio_indice_zung': round(promedio_indice_zung, 1),
        'ultima_zung': ultima_zung,
        'distribucion_zung': distribucion_zung,
    }
    return render(request, 'PWMS/historial_integrado.html', context)

# ===== REGISTROS FISIOLÓGICOS =====
@never_cache
@login_required
def nuevo_registro_fisiologico(request):
    return render(request, 'PWMS/nuevo_registro_fisiologico.html', {'titulo': 'Nuevo Registro Fisiológico'})

@never_cache
@login_required
def historial_fisiologico(request):
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

@login_required
def nasa_tlx_create(request):
    if request.method == 'POST':
        form = NASATLXForm(request.POST)
        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            
            # Calcular pesos desde comparaciones
            comparaciones = [f'comparacion_{i}' for i in range(1,16)]
            pesos = {k:0 for k in ['demanda_mental','demanda_fisica','demanda_temporal','rendimiento','esfuerzo','frustracion']}
            for c in comparaciones:
                sel = request.POST.get(c)
                if sel in pesos:
                    pesos[sel] += 1
            for key in pesos:
                setattr(evaluacion, f'peso_{key}', pesos[key])
            
            evaluacion.save()
            
            # ===== BUSCAR Y ASIGNAR VIDEO AUTOMÁTICAMENTE =====
            import os
            from django.conf import settings
            
            nasa_dir = os.path.join(settings.MEDIA_ROOT, 'videos_nasa_tlx')
            if os.path.exists(nasa_dir):
                videos = [f for f in os.listdir(nasa_dir) if f.endswith('.webm')]
                if videos:
                    videos.sort(key=lambda x: os.path.getmtime(os.path.join(nasa_dir, x)), reverse=True)
                    evaluacion.video = os.path.join('videos_nasa_tlx', videos[0])
                    evaluacion.save()
            
            messages.success(request, 'Evaluación NASA TLX guardada correctamente')
            return redirect('PWMS:nasa_tlx_resultado', pk=evaluacion.pk)
        else:
            messages.error(request, 'Error en el formulario')
    else:
        form = NASATLXForm()
    
    return render(request, 'PWMS/nasa_tlx_form.html', {'form': form})

@login_required
def nasa_tlx_historial(request):
    evaluaciones = EvaluacionNASATLX.objects.filter(usuario=request.user).order_by('-id')
    total = evaluaciones.count()
    promedio = evaluaciones.aggregate(Avg('puntuacion_total'))['puntuacion_total__avg'] or 0
    paginator = Paginator(evaluaciones, 10)
    page = request.GET.get('page')
    evals_page = paginator.get_page(page)
    
    return render(request, 'PWMS/nasa_tlx_historial.html', {
        'evaluaciones': evals_page,
        'total_evaluaciones': total,
        'promedio_carga': round(promedio, 1),
    })

@login_required
def nasa_tlx_resultado(request, pk):
    evaluacion = get_object_or_404(EvaluacionNASATLX, pk=pk, usuario=request.user)
    punt = evaluacion.puntuacion_total
    
    if punt < 30:
        color, icono, interpretacion = 'success', 'bi-emoji-smile', 'Carga BAJA'
    elif punt < 60:
        color, icono, interpretacion = 'warning', 'bi-emoji-neutral', 'Carga MODERADA'
    else:
        color, icono, interpretacion = 'danger', 'bi-emoji-frown', 'Carga ALTA'
    
    dimensiones = [
        {'dimension': 'Demanda Mental', 'puntuacion': evaluacion.demanda_mental, 'peso': evaluacion.peso_demanda_mental},
        {'dimension': 'Demanda Física', 'puntuacion': evaluacion.demanda_fisica, 'peso': evaluacion.peso_demanda_fisica},
        {'dimension': 'Demanda Temporal', 'puntuacion': evaluacion.demanda_temporal, 'peso': evaluacion.peso_demanda_temporal},
        {'dimension': 'Rendimiento', 'puntuacion': evaluacion.rendimiento, 'peso': evaluacion.peso_rendimiento},
        {'dimension': 'Esfuerzo', 'puntuacion': evaluacion.esfuerzo, 'peso': evaluacion.peso_esfuerzo},
        {'dimension': 'Frustración', 'puntuacion': evaluacion.frustracion, 'peso': evaluacion.peso_frustracion},
    ]
    
    return render(request, 'PWMS/nasa_tlx_resultado.html', {
        'evaluacion': evaluacion,
        'color': color,
        'icono': icono,
        'interpretacion': interpretacion,
        'dimensiones': dimensiones,
    })

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def guardar_video_nasa_tlx(request):
    try:
        if 'video' not in request.FILES:
            return JsonResponse({'error': 'No video'}, status=400)
        
        video = request.FILES['video']
        timestamp = int(timezone.now().timestamp())
        username = request.user.username
        filename = f"{username}_{timestamp}.webm"
        dest_path = os.path.join('videos_nasa_tlx', filename)
        dest_full = os.path.join(settings.MEDIA_ROOT, dest_path)
        
        os.makedirs(os.path.dirname(dest_full), exist_ok=True)
        
        with open(dest_full, 'wb') as f:
            for chunk in video.chunks():
                f.write(chunk)
        
        return JsonResponse({'success': True, 'video_path': dest_path})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ===== ZUNG ANXIETY =====
@login_required
def zung_anxiety_nuevo(request):
    if request.method == 'POST':
        form = ZungAnxietyScaleForm(request.POST)
        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            evaluacion.save()
            
            # ===== BUSCAR Y ASIGNAR VIDEO AUTOMÁTICAMENTE =====
            import os
            from django.conf import settings
            
            zung_dir = os.path.join(settings.MEDIA_ROOT, 'videos_zung')
            if os.path.exists(zung_dir):
                videos = [f for f in os.listdir(zung_dir) if f.endswith('.webm')]
                if videos:
                    videos.sort(key=lambda x: os.path.getmtime(os.path.join(zung_dir, x)), reverse=True)
                    evaluacion.video_path = os.path.join('videos_zung', videos[0])
                    evaluacion.video_duration = 120
                    evaluacion.video_size = os.path.getsize(os.path.join(zung_dir, videos[0]))
                    evaluacion.save()
            
            messages.success(request, 'Evaluación Zung guardada correctamente')
            return redirect('PWMS:zung_anxiety_resultados', pk=evaluacion.pk)
        else:
            messages.error(request, f'Error: {form.errors}')
    else:
        form = ZungAnxietyScaleForm()
    
    return render(request, 'PWMS/zung_anxiety_form.html', {'form': form})

@login_required
def zung_anxiety_resultados(request, pk):
    prueba = get_object_or_404(ZungAnxietyScale, pk=pk, usuario=request.user)
    respuestas = [
        prueba.p01_me_siento_mas_nervioso, prueba.p02_siento_miedo_sin_razon,
        prueba.p03_me_siento_alterado, prueba.p04_siento_que_me_desmorono,
        prueba.p05_siento_que_todo_bien, prueba.p06_temblor_sacudidas,
        prueba.p07_dolores_cabeza_cuello, prueba.p08_debilidad_fatiga,
        prueba.p09_siento_calma_tranquilidad, prueba.p10_siento_latidos_corazon,
        prueba.p11_mareos, prueba.p12_desmayos, prueba.p13_respiracion_normal,
        prueba.p14_entumecimiento_hormigueo, prueba.p15_dolores_estomacales,
        prueba.p16_necesidad_orinar, prueba.p17_manos_calidas_secas,
        prueba.p18_sonrojo_bochorno, prueba.p19_duermo_bien_descanso,
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
    pruebas = ZungAnxietyScale.objects.filter(usuario=request.user).order_by('-id')
    total = pruebas.count()
    promedio = pruebas.aggregate(Avg('puntuacion_indice'))['puntuacion_indice__avg'] or 0
    paginator = Paginator(pruebas, 10)
    page = request.GET.get('page')
    pruebas_page = paginator.get_page(page)
    
    return render(request, 'PWMS/zung_anxiety_historial.html', {
        'pruebas': pruebas_page,
        'total_evaluaciones': total,
        'promedio_indice': round(promedio, 1),
    })

@csrf_exempt
@require_http_methods(["POST"])
@login_required
def guardar_video_zung(request):
    try:
        if 'video' not in request.FILES:
            return JsonResponse({'error': 'No video'}, status=400)
        
        video = request.FILES['video']
        timestamp = int(timezone.now().timestamp())
        username = request.user.username
        filename = f"{username}_{timestamp}.webm"
        dest_path = os.path.join('videos_zung', filename)
        dest_full = os.path.join(settings.MEDIA_ROOT, dest_path)
        
        os.makedirs(os.path.dirname(dest_full), exist_ok=True)
        
        with open(dest_full, 'wb') as f:
            for chunk in video.chunks():
                f.write(chunk)
        
        return JsonResponse({
            'success': True, 
            'video_path': dest_path,
            'video_size': os.path.getsize(dest_full)
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
def analizar_estres_video(request, tipo, id):
    """
    Analiza estrés facial de un video guardado
    tipo: 'nasa' o 'zung'
    id: ID de la evaluación
    """
    if tipo == 'nasa':
        evaluacion = get_object_or_404(EvaluacionNASATLX, pk=id, usuario=request.user)
        video_path = evaluacion.video
    else:
        evaluacion = get_object_or_404(ZungAnxietyScale, pk=id, usuario=request.user)
        video_path = evaluacion.video_path
    
    if not video_path:
        return JsonResponse({'error': 'No hay video asociado'}, status=400)
    
    full_path = os.path.join(settings.MEDIA_ROOT, video_path)
    
    if not os.path.exists(full_path):
        return JsonResponse({'error': 'Archivo de video no encontrado'}, status=404)
    
    # Analizar video
    analyzer = FaceAnalyzer()
    resultado = analyzer.detectar_estres(full_path)
    
    if not resultado:
        return JsonResponse({'error': 'No se pudo analizar el video'}, status=500)
    
    # Guardar resultados en BD
    analisis = VideoAnalisisEstrés.objects.create(
        usuario=request.user,
        evaluacion_nasa=evaluacion if tipo == 'nasa' else None,
        evaluacion_zung=evaluacion if tipo == 'zung' else None,
        puntuacion_estres_facial=resultado['puntuacion_estres'],
        variabilidad_emocional=resultado['variabilidad_emocional'],
        tiempo_relajado=resultado['tiempo_relajado'],
        tiempo_tension=resultado['tiempo_tension'],
        datos_raw=resultado
    )
    
    return JsonResponse({
        'status': 'success',
        'analisis_id': analisis.id,
        'resultado': resultado
    })




# ===== GRÁFICAS =====
@never_cache
@login_required
def grafica_presion_arterial(request):
    return render(request, 'PWMS/graficas/presion_arterial.html', {'titulo': 'Presión Arterial'})

@never_cache
@login_required
def grafica_frecuencia_cardiaca(request):
    return render(request, 'PWMS/graficas/frecuencia_cardiaca.html', {'titulo': 'Frecuencia Cardíaca'})

@never_cache
@login_required
def grafica_temperatura(request):
    return render(request, 'PWMS/graficas/temperatura.html', {'titulo': 'Temperatura'})

@never_cache
@login_required
def grafica_pasos_actividad(request):
    return render(request, 'PWMS/graficas/pasos_actividad.html', {'titulo': 'Actividad Física'})

@never_cache
@login_required
def grafica_sueno(request):
    return render(request, 'PWMS/graficas/sueno.html', {'titulo': 'Patrón de Sueño'})

@never_cache
@login_required
def grafica_oxigenacion(request):
    return render(request, 'PWMS/graficas/oxigenacion.html', {'titulo': 'Oxigenación en Sangre'})

@never_cache
@login_required
def grafica_psicologico(request):
    return render(request, 'PWMS/graficas/psicologico.html', {'titulo': 'Estado Psicológico'})

# ===== PERFIL =====
@never_cache
@login_required
def perfil(request):
    perfil, created = PerfilPWMS.objects.get_or_create(usuario=request.user, defaults={'pin': '0000'})
    context = {'perfil': perfil, 'total_psicologico': 0, 'total_fisiologico': 0}
    return render(request, 'PWMS/perfil.html', context)

@never_cache
@login_required
def completar_perfil(request):
    perfil, created = PerfilPWMS.objects.get_or_create(usuario=request.user, defaults={'pin': '0000'})
    if request.method == 'POST':
        if request.FILES.get('foto'):
            perfil.foto = request.FILES.get('foto')
        perfil.nombre_completo = request.POST.get('nombre_completo')
        perfil.telefono = request.POST.get('telefono')
        perfil.fecha_nacimiento = request.POST.get('fecha_nacimiento') or None
        perfil.genero = request.POST.get('genero')
        pin = request.POST.get('pin')
        if pin and len(pin) == 4 and pin.isdigit():
            perfil.pin = pin
        else:
            messages.error(request, "El PIN debe tener exactamente 4 números.")
            return redirect('PWMS:completar_perfil')
        perfil.grupo_sanguineo = request.POST.get('grupo_sanguineo')
        perfil.alergias = request.POST.get('alergias')
        perfil.medicamentos = request.POST.get('medicamentos')
        perfil.condiciones_medicas = request.POST.get('condiciones_medicas')
        perfil.psicologo_asignado = request.POST.get('psicologo_asignado')
        perfil.motivo_consulta = request.POST.get('motivo_consulta')
        perfil.compartir_datos_medicos = 'compartir_datos_medicos' in request.POST
        perfil.recibir_recordatorios = 'recibir_recordatorios' in request.POST
        perfil.save()
        messages.success(request, "Perfil actualizado correctamente.")
        return redirect('PWMS:perfil')
    return render(request, 'PWMS/completar_perfil.html', {'perfil': perfil})


    pruebas = ZungAnxietyScale.objects.filter(usuario=request.user)
    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    nivel = request.GET.get('nivel')
    if fecha_desde:
        pruebas = pruebas.filter(fecha_registro__date__gte=fecha_desde)
    if fecha_hasta:
        pruebas = pruebas.filter(fecha_registro__date__lte=fecha_hasta)
    if nivel:
        pruebas = pruebas.filter(nivel_ansiedad=nivel)
    pruebas = pruebas.order_by('-fecha_registro')
    total_evaluaciones = pruebas.count()
    ultima_prueba = pruebas.first()
    ultimo_indice = ultima_prueba.puntuacion_indice if ultima_prueba else None
    promedio_indice = pruebas.aggregate(Avg('puntuacion_indice'))['puntuacion_indice__avg']
    tendencia = 'estable'
    if pruebas.count() >= 2:
        ultimos_dos = list(pruebas[:2])
        if ultimos_dos[0].puntuacion_indice < ultimos_dos[1].puntuacion_indice:
            tendencia = 'mejorando'
        elif ultimos_dos[0].puntuacion_indice > ultimos_dos[1].puntuacion_indice:
            tendencia = 'empeorando'
    paginator = Paginator(pruebas, 10)
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

# ===== ENDPOINTS API (para gráficas y ML) =====
@csrf_exempt
@require_POST
def upload_health_csv(request):
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Token '):
            return JsonResponse({'status': 'error', 'message': 'Token de autenticación requerido'}, status=401)
        token = auth_header.split(' ')[1]
        if 'csv_file' not in request.FILES:
            return JsonResponse({'status': 'error', 'message': 'No se envió archivo CSV'}, status=400)
        csv_file = request.FILES['csv_file']
        upload_dir = 'uploads/csv_files/'
        os.makedirs(upload_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"health_data_{timestamp}.csv"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, 'wb+') as destination:
            for chunk in csv_file.chunks():
                destination.write(chunk)
        csv_file.seek(0)
        file_content = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(file_content))
        records = []
        records_processed = 0
        for row_num, row in enumerate(csv_reader, 1):
            try:
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
            except (ValueError, KeyError) as e:
                continue
        return JsonResponse({
            'status': 'success',
            'message': 'CSV procesado correctamente',
            'filename': filename,
            'records_processed': records_processed,
            'total_records_in_csv': len(records),
            'server_timestamp': timezone.now().isoformat(),
            'sample_record': records[0] if records else None
        }, status=200)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': f'Error procesando CSV: {str(e)}'}, status=500)

@login_required
def api_fisiologicos_ultimos(request):
    try:
        limite = int(request.GET.get('limite', 10))
        registros = RegistroFisiologico.objects.filter(usuario=request.user).order_by('-fecha')[:limite]
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
    try:
        dias = int(request.GET.get('dias', 7))
        fecha_limite = timezone.now() - timedelta(days=dias)
        registros = RegistroFisiologico.objects.filter(usuario=request.user, fecha__gte=fecha_limite)
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
        return JsonResponse({'status': 'success', 'total_registros': total, 'promedios': promedios})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def api_fisiologicos_tendencia(request):
    try:
        dias = int(request.GET.get('dias', 7))
        variable = request.GET.get('variable', 'fc')
        fecha_limite = timezone.now() - timedelta(days=dias)
        registros = RegistroFisiologico.objects.filter(usuario=request.user, fecha__gte=fecha_limite).order_by('fecha')
        mapa = {'fc': 'frecuencia_cardiaca', 'presion': 'presion_arterial_sistolica', 'temperatura': 'temperatura', 'spo2': 'oxigenacion_sangre', 'estres': 'nivel_estres'}
        campo = mapa.get(variable, 'frecuencia_cardiaca')
        data = []
        fechas = []
        for r in registros:
            valor = getattr(r, campo)
            if campo == 'temperatura':
                valor = float(valor)
            data.append({'fecha': r.fecha.strftime('%Y-%m-%d %H:%M'), 'valor': valor})
            fechas.append(r.fecha.strftime('%d/%m %H:%M'))
        return JsonResponse({'status': 'success', 'total_puntos': len(data), 'fechas': fechas, 'data': data})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@login_required
def api_fisiologicos_por_fecha(request):
    try:
        fecha_str = request.GET.get('fecha')
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        registros = RegistroFisiologico.objects.filter(usuario=request.user, fecha__date=fecha).order_by('fecha')
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
    try:
        ultimo = RegistroFisiologico.objects.filter(usuario=request.user).order_by('-fecha').first()
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

@login_required
def api_ml_datos_fisiologicos(request):
    try:
        queryset = RegistroFisiologico.objects.filter(usuario=request.user)
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