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
from django.db.models import Avg
from django.utils import timezone
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.core.serializers.json import DjangoJSONEncoder
from xml.sax.saxutils import escape

import csv
import io
import json
import os
import time
from datetime import date, datetime, timedelta

from .models import (
    RegistroFisiologico,
    PerfilPWMS,
    ZungAnxietyScale,
    EvaluacionNASATLX,
    Mission,
)
from .forms import NASATLXForm, ZungAnxietyScaleForm


# ============================================================
# REGISTRO DE USUARIO
# ============================================================

@never_cache
def registro_usuario(request):
    """Registro de usuario completo con formulario de 2 pasos."""
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

            if not pin or len(pin) != 4 or not pin.isdigit():
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
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    email=email
                )

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
            messages.error(request, f'Error al registrar usuario: {str(e)}')
            return render(request, 'PWMS/registro.html')

    return render(request, 'PWMS/registro.html')


# ============================================================
# LOGIN / LOGOUT
# ============================================================

@require_http_methods(["GET", "POST"])
def panel_login(request):
    """Login con PIN para PWMS."""
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

            messages.error(request, 'PIN incorrecto')

        except User.DoesNotExist:
            messages.error(request, 'Usuario no encontrado')

    response = render(request, 'PWMS/login.html')
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    return response


def panel_logout(request):
    username = request.user.username if request.user.is_authenticated else "Usuario"
    user_id = request.user.id if request.user.is_authenticated else None

    logout(request)

    if request.session.session_key:
        try:
            from django.contrib.sessions.models import Session
            Session.objects.filter(session_key=request.session.session_key).delete()
        except Exception:
            pass

    if user_id:
        try:
            from django.contrib.sessions.models import Session
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                session_data = session.get_decoded()
                if str(user_id) == session_data.get('_auth_user_id', ''):
                    session.delete()
        except Exception:
            pass

    request.session.flush()

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


# ============================================================
# DASHBOARD
# ============================================================

@never_cache
@login_required
def pwms_dashboard(request):
    registros_fisiologicos = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha')[:5]

    ultimas_evaluaciones_nasa = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion')[:5]

    ultimas_evaluaciones_zung = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-fecha_registro')[:5]

    ultimo_fisiologico = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha').first()

    ultimo_tlx = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion').first()

    ultimo_zung = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-fecha_registro').first()

    avg_fc = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).aggregate(avg=Avg('frecuencia_cardiaca'))['avg']

    response = render(request, 'PWMS/dashboard.html', {
        'usuario': request.user,
        'perfil': request.user.perfil_pwms,
        'registros_fisiologicos': registros_fisiologicos,
        'ultimas_evaluaciones_nasa': ultimas_evaluaciones_nasa,
        'ultimas_evaluaciones_zung': ultimas_evaluaciones_zung,
        'promedio_fc': round(avg_fc, 1) if avg_fc else None,
        'ultimo_fisiologico': ultimo_fisiologico,
        'ultimo_tlx': ultimo_tlx,
        'ultimo_zung': ultimo_zung,
    })
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    return response


# ============================================================
# EVALUACIONES PSICOLÓGICAS: NASA-TLX + ZUNG
# ============================================================

@never_cache
@login_required
def nuevo_registro_psicologico(request):
    """Selector de prueba psicológica: NASA-TLX o Zung."""
    return render(request, 'PWMS/nuevo_registro_psicologico.html', {
        'titulo': 'Nueva evaluación psicológica'
    })


@never_cache
@login_required
def historial_psicologico(request):
    from django.db.models import Avg
    
    evaluaciones_nasa = EvaluacionNASATLX.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    pruebas_zung = ZungAnxietyScale.objects.filter(usuario=request.user).order_by('-fecha_registro')
    
    total_nasa = evaluaciones_nasa.count()
    total_zung = pruebas_zung.count()
    
    promedio_carga = evaluaciones_nasa.aggregate(promedio=Avg('puntuacion_total'))['promedio'] or 0
    promedio_ansiedad = pruebas_zung.aggregate(promedio=Avg('puntuacion_indice'))['promedio'] or 0
    
    distribucion_carga = {
        'baja': evaluaciones_nasa.filter(puntuacion_total__lt=30).count(),
        'moderada': evaluaciones_nasa.filter(puntuacion_total__gte=30, puntuacion_total__lt=60).count(),
        'alta': evaluaciones_nasa.filter(puntuacion_total__gte=60).count(),
    }
    
    distribucion_zung = {
        'normal': pruebas_zung.filter(nivel_ansiedad='normal').count(),
        'minima': pruebas_zung.filter(nivel_ansiedad='minima').count(),
        'marcada': pruebas_zung.filter(nivel_ansiedad='marcada').count(),
        'extrema': pruebas_zung.filter(nivel_ansiedad='extrema').count(),
    }
    
    context = {
        'evaluaciones_nasa': evaluaciones_nasa,
        'pruebas_zung': pruebas_zung,
        'total_nasa': total_nasa,
        'total_zung': total_zung,
        'promedio_carga': round(promedio_carga, 1),
        'promedio_ansiedad': round(promedio_ansiedad, 1),
        'distribucion_carga': distribucion_carga,
        'distribucion_zung': distribucion_zung,
    }
    
    return render(request, 'PWMS/historial_psicologico.html', context)

@never_cache
@login_required
def historial_psic_integrado(request):
    """Alias para compatibilidad con URL anterior."""
    return historial_psicologico(request)


@never_cache
@login_required
def resumen_integrado(request):
    """Resumen integrado NASA-TLX + Zung."""
    evaluaciones = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('fecha_creacion')

    pruebas_zung = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('fecha_registro')

    total_evaluaciones = evaluaciones.count()
    promedio_carga = evaluaciones.aggregate(
        Avg('puntuacion_total')
    )['puntuacion_total__avg'] or 0

    ultima_evaluacion = evaluaciones.last()
    dimensiones_tlx = []

    if ultima_evaluacion:
        dimensiones_tlx = [
            {'dimension': 'Demanda Mental', 'valor': ultima_evaluacion.demanda_mental or 0},
            {'dimension': 'Demanda Física', 'valor': ultima_evaluacion.demanda_fisica or 0},
            {'dimension': 'Demanda Temporal', 'valor': ultima_evaluacion.demanda_temporal or 0},
            {'dimension': 'Rendimiento', 'valor': ultima_evaluacion.rendimiento or 0},
            {'dimension': 'Esfuerzo', 'valor': ultima_evaluacion.esfuerzo or 0},
            {'dimension': 'Frustración', 'valor': ultima_evaluacion.frustracion or 0},
        ]

    context = {
        'evaluaciones': evaluaciones,
        'total_evaluaciones': total_evaluaciones,
        'promedio_carga': round(promedio_carga, 1),
        'dimensiones_tlx_json': json.dumps(dimensiones_tlx, cls=DjangoJSONEncoder),
        'pruebas_zung': pruebas_zung,
        'promedio_animo': None,
        'registros': [],
    }

    return render(request, 'PWMS/resumen_integrado.html', context)


# ============================================================
# REGISTROS FISIOLÓGICOS
# ============================================================

@never_cache
@login_required
def nuevo_registro_fisiologico(request):
    return render(request, 'PWMS/nuevo_registro_fisiologico.html', {
        'titulo': 'Nuevo Registro Fisiológico'
    })


@never_cache
@login_required
def historial_fisiologico(request):
    registros_qs = RegistroFisiologico.objects.filter(
        usuario=request.user
    ).order_by('-fecha')

    total_registros = registros_qs.count()
    promedios = registros_qs.aggregate(
        frecuencia_cardiaca=Avg('frecuencia_cardiaca'),
        pasos_diarios=Avg('pasos_diarios'),
        nivel_estres=Avg('nivel_estres'),
        oxigenacion=Avg('oxigenacion_sangre'),
        temperatura=Avg('temperatura')
    )

    context = {
        'total_registros': total_registros,
        'primer_registro': registros_qs.order_by('fecha').first(),
        'promedios': promedios,
        'ultimo_registro': registros_qs.first(),
        'registros': registros_qs[:50],
    }

    return render(request, 'PWMS/historial_fisiologico.html', context)


# ============================================================
# NASA-TLX
# ============================================================

@login_required
def nasa_tlx_create(request):
    if request.method == 'POST':
        form = NASATLXForm(request.POST)

        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user

            comparaciones = [f'comparacion_{i}' for i in range(1, 16)]
            pesos = {
                'demanda_mental': 0,
                'demanda_fisica': 0,
                'demanda_temporal': 0,
                'rendimiento': 0,
                'esfuerzo': 0,
                'frustracion': 0,
            }

            for c in comparaciones:
                seleccion = request.POST.get(c)
                if seleccion in pesos:
                    pesos[seleccion] += 1

            for key, value in pesos.items():
                setattr(evaluacion, f'peso_{key}', value)

            evaluacion.save()
            messages.success(request, 'Evaluación NASA-TLX guardada correctamente')
            return redirect('PWMS:nasa_tlx_resultado', pk=evaluacion.pk)

        messages.error(request, 'Error en el formulario')
    else:
        form = NASATLXForm()

    return render(request, 'PWMS/nasa_tlx_form.html', {'form': form})


@login_required
def nasa_tlx_historial(request):
    evaluaciones = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-id')

    total = evaluaciones.count()
    promedio = evaluaciones.aggregate(
        Avg('puntuacion_total')
    )['puntuacion_total__avg'] or 0

    paginator = Paginator(evaluaciones, 10)
    page = request.GET.get('page')

    return render(request, 'PWMS/nasa_tlx_historial.html', {
        'evaluaciones': paginator.get_page(page),
        'total_evaluaciones': total,
        'promedio_carga': round(promedio, 1),
    })


@login_required
def nasa_tlx_resultado(request, pk):
    evaluacion = get_object_or_404(
        EvaluacionNASATLX,
        pk=pk,
        usuario=request.user
    )

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


# ============================================================
# ZUNG SAS
# ============================================================

@login_required
def zung_anxiety_nuevo(request):
    if request.method == 'POST':
        form = ZungAnxietyScaleForm(request.POST)

        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            evaluacion.save()

            messages.success(request, 'Evaluación Zung guardada correctamente')
            return redirect('PWMS:zung_anxiety_resultados', pk=evaluacion.pk)

        messages.error(request, f'Error: {form.errors}')
    else:
        form = ZungAnxietyScaleForm()

    return render(request, 'PWMS/zung_anxiety_form.html', {'form': form})


@login_required
def zung_anxiety_resultados(request, pk):
    prueba = get_object_or_404(
        ZungAnxietyScale,
        pk=pk,
        usuario=request.user
    )

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

    return render(request, 'PWMS/zung_anxiety_resultados.html', {
        'prueba': prueba,
        'conteo_r1': respuestas.count(1),
        'conteo_r2': respuestas.count(2),
        'conteo_r3': respuestas.count(3),
        'conteo_r4': respuestas.count(4),
    })


@login_required
def zung_anxiety_historial(request):
    pruebas = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-id')

    total = pruebas.count()
    promedio = pruebas.aggregate(
        Avg('puntuacion_indice')
    )['puntuacion_indice__avg'] or 0

    paginator = Paginator(pruebas, 10)
    page = request.GET.get('page')

    return render(request, 'PWMS/zung_anxiety_historial.html', {
        'pruebas': paginator.get_page(page),
        'total_evaluaciones': total,
        'promedio_indice': round(promedio, 1),
    })

# ============================================================
# GRÁFICAS
# ============================================================

@never_cache
@login_required
def grafica_presion_arterial(request):
    return render(request, 'PWMS/graficas/presion_arterial.html', {
        'titulo': 'Presión Arterial'
    })


@never_cache
@login_required
def grafica_frecuencia_cardiaca(request):
    return render(request, 'PWMS/graficas/frecuencia_cardiaca.html', {
        'titulo': 'Frecuencia Cardíaca'
    })


@never_cache
@login_required
def grafica_temperatura(request):
    return render(request, 'PWMS/graficas/temperatura.html', {
        'titulo': 'Temperatura'
    })


@never_cache
@login_required
def grafica_pasos_actividad(request):
    return render(request, 'PWMS/graficas/pasos_actividad.html', {
        'titulo': 'Actividad Física'
    })


@never_cache
@login_required
def grafica_sueno(request):
    return render(request, 'PWMS/graficas/sueno.html', {
        'titulo': 'Patrón de Sueño'
    })


@never_cache
@login_required
def grafica_oxigenacion(request):
    return render(request, 'PWMS/graficas/oxigenacion.html', {
        'titulo': 'Oxigenación en Sangre'
    })


@never_cache
@login_required
def grafica_psicologico(request):
    return historial_psicologico(request)


# ============================================================
# PERFIL
# ============================================================

@never_cache
@login_required
def perfil(request):
    perfil_obj, _ = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    context = {
        'perfil': perfil_obj,
        'total_psicologico': (
            EvaluacionNASATLX.objects.filter(usuario=request.user).count()
            + ZungAnxietyScale.objects.filter(usuario=request.user).count()
        ),
        'total_fisiologico': RegistroFisiologico.objects.filter(
            usuario=request.user
        ).count(),
    }

    return render(request, 'PWMS/perfil.html', context)


@never_cache
@login_required
def completar_perfil(request):
    perfil_obj, _ = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    if request.method == 'POST':
        if request.FILES.get('foto'):
            perfil_obj.foto = request.FILES.get('foto')

        perfil_obj.nombre_completo = request.POST.get('nombre_completo')
        perfil_obj.telefono = request.POST.get('telefono')
        perfil_obj.fecha_nacimiento = request.POST.get('fecha_nacimiento') or None
        perfil_obj.genero = request.POST.get('genero')

        pin = request.POST.get('pin')
        if pin and len(pin) == 4 and pin.isdigit():
            perfil_obj.pin = pin
        else:
            messages.error(request, "El PIN debe tener exactamente 4 números.")
            return redirect('PWMS:completar_perfil')

        perfil_obj.grupo_sanguineo = request.POST.get('grupo_sanguineo')
        perfil_obj.alergias = request.POST.get('alergias')
        perfil_obj.medicamentos = request.POST.get('medicamentos')
        perfil_obj.condiciones_medicas = request.POST.get('condiciones_medicas')
        perfil_obj.psicologo_asignado = request.POST.get('psicologo_asignado')
        perfil_obj.motivo_consulta = request.POST.get('motivo_consulta')
        perfil_obj.compartir_datos_medicos = 'compartir_datos_medicos' in request.POST
        perfil_obj.recibir_recordatorios = 'recibir_recordatorios' in request.POST

        perfil_obj.save()
        messages.success(request, "Perfil actualizado correctamente.")
        return redirect('PWMS:perfil')

    return render(request, 'PWMS/completar_perfil.html', {
        'perfil': perfil_obj
    })


# ============================================================
# ENDPOINTS API
# ============================================================

@csrf_exempt
@require_POST
def upload_health_csv(request):
    try:
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Token '):
            return JsonResponse({
                'status': 'error',
                'message': 'Token de autenticación requerido'
            }, status=401)

        if 'csv_file' not in request.FILES:
            return JsonResponse({
                'status': 'error',
                'message': 'No se envió archivo CSV'
            }, status=400)

        csv_file = request.FILES['csv_file']
        file_content = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(file_content))

        records = []
        for row in csv_reader:
            try:
                records.append({
                    'id': row.get('id', ''),
                    'timestamp': row.get('timestamp_unix', ''),
                    'fecha_hora': row.get('fecha_hora', ''),
                    'pasos': int(row.get('pasos', 0)),
                    'ritmo_cardiaco': int(row.get('ritmo_cardiaco', 0)),
                    'estres_nivel': float(row.get('estres_nivel_calculado', 0)),
                    'estres_categoria': row.get('estres_categoria', '')
                })
            except (ValueError, KeyError):
                continue

        return JsonResponse({
            'status': 'success',
            'message': 'CSV procesado correctamente',
            'records_processed': len(records),
            'total_records_in_csv': len(records),
            'server_timestamp': timezone.now().isoformat(),
            'sample_record': records[0] if records else None
        }, status=200)

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error procesando CSV: {str(e)}'
        }, status=500)


@login_required
def api_fisiologicos_ultimos(request):
    try:
        limite = int(request.GET.get('limite', 10))
        registros = RegistroFisiologico.objects.filter(
            usuario=request.user
        ).order_by('-fecha')[:limite]

        data = [{
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
        } for r in registros]

        return JsonResponse({'status': 'success', 'data': data})

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_estadisticas(request):
    try:
        dias = int(request.GET.get('dias', 7))
        fecha_limite = timezone.now() - timedelta(days=dias)

        registros = RegistroFisiologico.objects.filter(
            usuario=request.user,
            fecha__gte=fecha_limite
        )

        if registros.count() == 0:
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
            if promedios[key] is not None:
                promedios[key] = round(promedios[key], 1)

        return JsonResponse({
            'status': 'success',
            'total_registros': registros.count(),
            'promedios': promedios
        })

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_tendencia(request):
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

            data.append({
                'fecha': r.fecha.strftime('%Y-%m-%d %H:%M'),
                'valor': valor
            })
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
    try:
        fecha_str = request.GET.get('fecha')
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()

        registros = RegistroFisiologico.objects.filter(
            usuario=request.user,
            fecha__date=fecha
        ).order_by('fecha')

        data = [{
            'hora': r.fecha.strftime('%H:%M'),
            'fc': r.frecuencia_cardiaca,
            'presion': f"{r.presion_arterial_sistolica}/{r.presion_arterial_diastolica}",
            'temp': float(r.temperatura),
            'spo2': r.oxigenacion_sangre,
            'estres': r.nivel_estres,
        } for r in registros]

        return JsonResponse({
            'status': 'success',
            'total_registros': len(data),
            'data': data
        })

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@login_required
def api_fisiologicos_ultimo_vivo(request):
    try:
        ultimo = RegistroFisiologico.objects.filter(
            usuario=request.user
        ).order_by('-fecha').first()

        if not ultimo:
            return JsonResponse({
                'status': 'success',
                'hay_datos': False
            })

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
            queryset = queryset.filter(
                fecha__gte=datetime.strptime(desde, '%Y-%m-%d')
            )

        if hasta:
            queryset = queryset.filter(
                fecha__lte=datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1)
            )

        registros = queryset.order_by('fecha')[:limite]

        data = [{
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
        } for r in registros]

        return JsonResponse({'data': data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def api_ml_datos_psicologicos(request):
    try:
        desde = request.GET.get('desde')
        hasta = request.GET.get('hasta')
        limite = int(request.GET.get('limite', 1000))

        nasa_qs = EvaluacionNASATLX.objects.filter(usuario=request.user)
        zung_qs = ZungAnxietyScale.objects.filter(usuario=request.user)

        if desde:
            fecha_desde = datetime.strptime(desde, '%Y-%m-%d')
            nasa_qs = nasa_qs.filter(fecha_creacion__gte=fecha_desde)
            zung_qs = zung_qs.filter(fecha_registro__gte=fecha_desde)

        if hasta:
            fecha_hasta = datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1)
            nasa_qs = nasa_qs.filter(fecha_creacion__lte=fecha_hasta)
            zung_qs = zung_qs.filter(fecha_registro__lte=fecha_hasta)

        data = {'nasa_tlx': [], 'zung_sas': []}

        for e in nasa_qs.order_by('fecha_creacion')[:limite]:
            data['nasa_tlx'].append({
                'id': e.id,
                'fecha_unix': int(e.fecha_creacion.timestamp()),
                'fecha': e.fecha_creacion.isoformat(),
                'demanda_mental': e.demanda_mental,
                'demanda_fisica': e.demanda_fisica,
                'demanda_temporal': e.demanda_temporal,
                'rendimiento': e.rendimiento,
                'esfuerzo': e.esfuerzo,
                'frustracion': e.frustracion,
                'puntuacion_total': e.puntuacion_total,
            })

        for z in zung_qs.order_by('fecha_registro')[:limite]:
            data['zung_sas'].append({
                'id': z.id,
                'fecha_unix': int(z.fecha_registro.timestamp()),
                'fecha': z.fecha_registro.isoformat(),
                'puntuacion_bruta': z.puntuacion_bruta,
                'puntuacion_indice': z.puntuacion_indice,
                'nivel_ansiedad': z.nivel_ansiedad,
            })

        return JsonResponse({'data': data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================
# EXPORTACIÓN XML SIMPLE: StressVocabulary
# ============================================================

def export_stress_vocabulary(request, user_id):
    user = get_object_or_404(User, id=user_id)

    registros_fisio = RegistroFisiologico.objects.filter(
        usuario=user
    ).order_by('-fecha')[:30]

    evaluaciones_nasa = EvaluacionNASATLX.objects.filter(
        usuario=user
    ).order_by('-fecha_creacion')[:30]

    evaluaciones_zung = ZungAnxietyScale.objects.filter(
        usuario=user
    ).order_by('-fecha_registro')[:30]

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<StressVocabulary>',
        f'  <Usuario>{escape(user.username)}</Usuario>',
        f'  <Email>{escape(user.email or "")}</Email>',
        f'  <FechaExportacion>{timezone.now().isoformat()}</FechaExportacion>',
    ]

    xml_lines.append('  <EvaluacionesNASATLX>')
    for eval_nasa in evaluaciones_nasa:
        xml_lines.append('    <Evaluacion>')
        xml_lines.append(f'      <Fecha>{eval_nasa.fecha_creacion.isoformat()}</Fecha>')
        xml_lines.append(f'      <DemandaMental>{eval_nasa.demanda_mental}</DemandaMental>')
        xml_lines.append(f'      <DemandaFisica>{eval_nasa.demanda_fisica}</DemandaFisica>')
        xml_lines.append(f'      <DemandaTemporal>{eval_nasa.demanda_temporal}</DemandaTemporal>')
        xml_lines.append(f'      <Rendimiento>{eval_nasa.rendimiento}</Rendimiento>')
        xml_lines.append(f'      <Esfuerzo>{eval_nasa.esfuerzo}</Esfuerzo>')
        xml_lines.append(f'      <Frustracion>{eval_nasa.frustracion}</Frustracion>')
        xml_lines.append(f'      <PuntuacionTotal>{eval_nasa.puntuacion_total}</PuntuacionTotal>')
        xml_lines.append('    </Evaluacion>')
    xml_lines.append('  </EvaluacionesNASATLX>')

    xml_lines.append('  <EvaluacionesZungSAS>')
    for zung in evaluaciones_zung:
        xml_lines.append('    <Evaluacion>')
        xml_lines.append(f'      <Fecha>{zung.fecha_registro.isoformat()}</Fecha>')
        xml_lines.append(f'      <PuntuacionBruta>{zung.puntuacion_bruta or ""}</PuntuacionBruta>')
        xml_lines.append(f'      <PuntuacionIndice>{zung.puntuacion_indice or ""}</PuntuacionIndice>')
        xml_lines.append(f'      <NivelAnsiedad>{escape(zung.nivel_ansiedad or "")}</NivelAnsiedad>')
        xml_lines.append('    </Evaluacion>')
    xml_lines.append('  </EvaluacionesZungSAS>')

    xml_lines.append('  <RegistrosFisiologicos>')
    for reg in registros_fisio:
        xml_lines.append('    <Registro>')
        xml_lines.append(f'      <Fecha>{reg.fecha.isoformat()}</Fecha>')
        xml_lines.append(f'      <FrecuenciaCardiaca>{reg.frecuencia_cardiaca}</FrecuenciaCardiaca>')
        xml_lines.append(f'      <HorasSueno>{reg.horas_sueno or ""}</HorasSueno>')
        xml_lines.append(f'      <NivelEstres>{reg.nivel_estres if reg.nivel_estres is not None else ""}</NivelEstres>')
        xml_lines.append('    </Registro>')
    xml_lines.append('  </RegistrosFisiologicos>')

    xml_lines.append('</StressVocabulary>')

    response = HttpResponse('\n'.join(xml_lines), content_type='application/xml')
    response['Content-Disposition'] = f'attachment; filename="stress_vocabulary_{user.username}.xml"'
    return response


# ============================================================
# MISIONES Y ANALOG CREW STUDY XML
# ============================================================

def export_mission_to_analog_xml(request, mission_id):
    mission = get_object_or_404(Mission, id=mission_id)
    xml_content = generate_analog_crew_study_xml(mission_id)

    response = HttpResponse(xml_content, content_type='application/xml')
    response['Content-Disposition'] = f'attachment; filename="analog_crew_study_{mission.name.replace(" ", "_")}.xml"'
    return response


def mission_dashboard(request, mission_id):
    mission = get_object_or_404(Mission, id=mission_id)
    
    total_assessments = 0
    for crew in mission.crew_members.all():
        total_assessments += EvaluacionNASATLX.objects.filter(usuario=crew).count()
        total_assessments += ZungAnxietyScale.objects.filter(usuario=crew).count()
        total_assessments += RegistroFisiologico.objects.filter(usuario=crew).count()
    
    context = {
        'mission': mission,
        'crew_count': mission.crew_members.count(),
        'total_assessments': total_assessments,
        'mission_days': mission.duration_days,
    }
    
    return render(request, 'mission_dashboard.html', context)
def export_mission_by_get(request):
    mission_id = request.GET.get('id')

    if not mission_id:
        return HttpResponse("Falta el parámetro 'id'. Usa: ?id=1", status=400)

    mission = get_object_or_404(Mission, id=mission_id)
    xml_content = generate_analog_crew_study_xml(mission.id)

    response = HttpResponse(xml_content, content_type='application/xml')
    response['Content-Disposition'] = f'attachment; filename="analog_crew_study_{mission.name.replace(" ", "_")}.xml"'
    return response


def mission_dashboard_by_get(request):
    mission_id = request.GET.get('id')

    if not mission_id:
        return HttpResponse("Falta el parámetro 'id'. Usa: ?id=1", status=400)

    mission = get_object_or_404(Mission, id=mission_id)
    return mission_dashboard(request, mission.id)


@csrf_exempt
def api_mission_stats(request, mission_id):
    mission = get_object_or_404(Mission, id=mission_id)

    stats = {
        'mission_name': mission.name,
        'duration': mission.duration_days,
        'crew_count': mission.crew_members.count(),
        'phases': mission.phases,
        'crew_stats': []
    }

    for crew in mission.crew_members.all():
        avg_tlx = EvaluacionNASATLX.objects.filter(
            usuario=crew
        ).aggregate(avg=Avg('puntuacion_total'))['avg']

        avg_zung = ZungAnxietyScale.objects.filter(
            usuario=crew
        ).aggregate(avg=Avg('puntuacion_indice'))['avg']

        avg_hr = RegistroFisiologico.objects.filter(
            usuario=crew
        ).aggregate(avg=Avg('frecuencia_cardiaca'))['avg']

        crew_stats = {
            'username': crew.username,
            'avg_workload_tlx': avg_tlx,
            'avg_anxiety_zung': avg_zung,
            'avg_heart_rate': avg_hr,
            'nasa_scores': list(
                EvaluacionNASATLX.objects.filter(usuario=crew)
                .values('puntuacion_total', 'fecha_creacion')
            ),
            'zung_scores': list(
                ZungAnxietyScale.objects.filter(usuario=crew)
                .values('puntuacion_indice', 'nivel_ansiedad', 'fecha_registro')
            ),
        }

        stats['crew_stats'].append(crew_stats)

    return JsonResponse(stats, safe=False)


def _scale_fisio_stress_to_1_10(value):
    if value is None:
        return ''
    try:
        # RegistroFisiologico.calcular_nivel_estres produce aprox. 0-75.
        return f"{((float(value) / 75.0) * 9.0 + 1.0):.1f}"
    except (TypeError, ValueError, ZeroDivisionError):
        return ''


def _scale_zung_to_1_10(value):
    if value is None:
        return ''
    try:
        # Zung índice: 25-100. Se normaliza a 1-10.
        return f"{((float(value) - 25.0) / 75.0 * 9.0 + 1.0):.1f}"
    except (TypeError, ValueError, ZeroDivisionError):
        return ''


def generate_analog_crew_study_xml(mission_id: int) -> str:
    try:
        mission = Mission.objects.get(id=mission_id)
    except Mission.DoesNotExist:
        return f"<error>Misión con ID {mission_id} no encontrada</error>"

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<AnalogCrewStudy>',
        '  <Mission>',
        f'    <MissionName>{escape(mission.name)}</MissionName>',
        f'    <HabitatType>{escape(mission.habitat_type)}</HabitatType>',
        f'    <Duration>{mission.duration_days}</Duration>',
    ]

    if mission.phases:
        for phase in mission.phases:
            xml_lines.extend([
                '    <Phase>',
                f'      <PhaseName>{escape(str(phase.get("name", "Unknown")))}</PhaseName>',
                f'      <DayStart>{phase.get("day_start", phase.get("start", 0))}</DayStart>',
                f'      <DayEnd>{phase.get("day_end", phase.get("end", 0))}</DayEnd>',
                '    </Phase>',
            ])

    xml_lines.append('  </Mission>')

    # Crew members
    for crew_user in mission.crew_members.all():
        perfil_obj = getattr(crew_user, 'perfil_pwms', None)
        role = perfil_obj.role if perfil_obj and perfil_obj.role else 'Scientist'
        experience = perfil_obj.experience if perfil_obj and perfil_obj.experience else 'Experienced'

        xml_lines.append(f'  <CrewMember role="{escape(role)}">')
        xml_lines.append(f'    <CrewID>{escape(crew_user.username)}</CrewID>')
        xml_lines.append('    <Demographics>')

        if perfil_obj and perfil_obj.fecha_nacimiento:
            age = date.today().year - perfil_obj.fecha_nacimiento.year
            xml_lines.append(f'      <Age>{age}</Age>')
        else:
            xml_lines.append('      <Age>0</Age>')

        gender_map = {
            'masculino': 'Male',
            'femenino': 'Female',
            'otro': 'Other',
            'prefiero_no_decirlo': 'Other'
        }
        gender = gender_map.get(perfil_obj.genero if perfil_obj else '', 'Other')

        xml_lines.extend([
            f'      <Gender>{gender}</Gender>',
            f'      <ExperienceLevel>{experience}</ExperienceLevel>',
            '    </Demographics>',
            '    <BaselineMeasures>',
            f'      <BaselineStress>{perfil_obj.baseline_stress if perfil_obj and perfil_obj.baseline_stress is not None else 0}</BaselineStress>',
            f'      <BaselineFatigue>{perfil_obj.baseline_fatigue if perfil_obj and perfil_obj.baseline_fatigue is not None else 0}</BaselineFatigue>',
            f'      <BaselineCognitive>{perfil_obj.baseline_cognitive if perfil_obj and perfil_obj.baseline_cognitive is not None else 0}</BaselineCognitive>',
            '    </BaselineMeasures>',
            '    <PsychologicalProfile type="Individualized">',
            f'      <ProfileID>PROF-{escape(crew_user.username)}</ProfileID>',
            '      <TimeSegment>Full mission</TimeSegment>',
        ])

        avg_tlx = EvaluacionNASATLX.objects.filter(
            usuario=crew_user
        ).aggregate(avg=Avg('puntuacion_total'))['avg']

        avg_zung = ZungAnxietyScale.objects.filter(
            usuario=crew_user
        ).aggregate(avg=Avg('puntuacion_indice'))['avg']

        profile_data = {
            'avg_workload_tlx': round(avg_tlx, 1) if avg_tlx is not None else None,
            'avg_anxiety_zung_index': round(avg_zung, 1) if avg_zung is not None else None,
            'total_tlx_assessments': EvaluacionNASATLX.objects.filter(usuario=crew_user).count(),
            'total_zung_assessments': ZungAnxietyScale.objects.filter(usuario=crew_user).count(),
            'pattern': 'derived from standardized PWMS assessments'
        }

        xml_lines.extend([
            f'      <ProfileData>{escape(json.dumps(profile_data))}</ProfileData>',
            '    </PsychologicalProfile>',
            '  </CrewMember>',
        ])

    all_dates = set()

    for registro_fisio in RegistroFisiologico.objects.filter(
        usuario__in=mission.crew_members.all()
    ):
        all_dates.add(registro_fisio.fecha.date())

    for eval_nasa in EvaluacionNASATLX.objects.filter(
        usuario__in=mission.crew_members.all()
    ):
        all_dates.add(eval_nasa.fecha_creacion.date())

    for eval_zung in ZungAnxietyScale.objects.filter(
        usuario__in=mission.crew_members.all()
    ):
        all_dates.add(eval_zung.fecha_registro.date())

    sorted_dates = sorted(all_dates)
    assessment_counter = 1

    for crew_user in mission.crew_members.all():
        for current_date in sorted_dates:
            mission_day = (
                (current_date - mission.start_date).days + 1
                if mission.start_date else 0
            )

            if mission_day <= 0 or mission_day > mission.duration_days:
                continue

            registro_fisio = RegistroFisiologico.objects.filter(
                usuario=crew_user,
                fecha__date=current_date
            ).first()

            eval_nasa = EvaluacionNASATLX.objects.filter(
                usuario=crew_user,
                fecha_creacion__date=current_date
            ).first()

            eval_zung = ZungAnxietyScale.objects.filter(
                usuario=crew_user,
                fecha_registro__date=current_date
            ).first()

            if not any([registro_fisio, eval_nasa, eval_zung]):
                continue

            xml_lines.extend([
                f'  <Assessment type="Daily" timestamp="{current_date.isoformat()}T12:00:00">',
                f'    <AssessmentID>ASSESS-{assessment_counter:04d}</AssessmentID>',
                f'    <CrewIDRef>{escape(crew_user.username)}</CrewIDRef>',
                f'    <MissionDay>{mission_day}</MissionDay>',
                '    <PsychologicalState>',
            ])

            # Estrés: fuente fisiológica calculada.
            stress_value = (
                _scale_fisio_stress_to_1_10(registro_fisio.nivel_estres)
                if registro_fisio else ''
            )

            # Ansiedad: fuente Zung SAS.
            anxiety_value = (
                _scale_zung_to_1_10(eval_zung.puntuacion_indice)
                if eval_zung else ''
            )

            xml_lines.extend([
                f'      <MentalStress>{stress_value}</MentalStress>',
                f'      <MentalStrain>{stress_value}</MentalStrain>',
                '      <PositiveAffect/>',
                '      <NegativeAffect/>',
                '      <FatigueLevel/>',
                f'      <Anxiety>{anxiety_value}</Anxiety>',
                '    </PsychologicalState>',
                '    <WorkloadMetrics>',
            ])

            if eval_nasa:
                xml_lines.extend([
                    f'      <MentalWorkload>{eval_nasa.demanda_mental / 2:.1f}</MentalWorkload>',
                    f'      <PhysicalWorkload>{eval_nasa.demanda_fisica / 2:.1f}</PhysicalWorkload>',
                    f'      <TaskDifficulty>{eval_nasa.demanda_temporal / 2:.1f}</TaskDifficulty>',
                    f'      <CognitivePerformance>{eval_nasa.puntuacion_total}</CognitivePerformance>',
                ])
            else:
                xml_lines.extend([
                    '      <MentalWorkload/>',
                    '      <PhysicalWorkload/>',
                    '      <TaskDifficulty/>',
                    '      <CognitivePerformance/>',
                ])

            xml_lines.extend([
                '    </WorkloadMetrics>',
                '    <SocialFactors>',
                '      <SocialSupport/>',
                '      <TeamCohesion/>',
                '      <Conflict/>',
                '      <IsolationPerception/>',
                '    </SocialFactors>',
                '    <HabitatPerception>',
                '      <Privacy/>',
                '      <Comfort/>',
                '      <Control/>',
                '      <SocialDensity/>',
                '      <HabitabilityScore/>',
                '    </HabitatPerception>',
                '    <PhysiologicalData>',
            ])

            if registro_fisio:
                xml_lines.extend([
                    f'      <HeartRate>{registro_fisio.frecuencia_cardiaca or ""}</HeartRate>',
                    f'      <SleepHours>{registro_fisio.horas_sueno or ""}</SleepHours>',
                    f'      <SleepQuality>{registro_fisio.puntuacion_sueno or ""}</SleepQuality>',
                    '      <CortisolLevel/>',
                ])
            else:
                xml_lines.extend([
                    '      <HeartRate/>',
                    '      <SleepHours/>',
                    '      <SleepQuality/>',
                    '      <CortisolLevel/>',
                ])

            xml_lines.extend([
                '    </PhysiologicalData>',
                '  </Assessment>',
            ])

            assessment_counter += 1

    xml_lines.append('</AnalogCrewStudy>')
    return '\n'.join(xml_lines)



def missions_list(request):
    missions = Mission.objects.all()
    return render(request, 'missions_list.html', {'missions': missions})

def mission_form(request, mission_id=None):
    mission = None

    if mission_id:
        mission = get_object_or_404(Mission, id=mission_id)

    all_users = User.objects.select_related('perfil_pwms').all()

    context = {
        'mission': mission,
        'missions': Mission.objects.all(),
        'all_users': all_users,
    }

    return render(request, 'mission_form.html', context)  # ← Quita 'pwms/'

@csrf_exempt
def api_save_mission(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)

        if data.get('mission_id'):
            mission = get_object_or_404(Mission, id=data['mission_id'])
            mission.name = data['name']
            mission.habitat_type = data['habitat_type']
            mission.duration_days = data['duration_days']
            mission.start_date = data['start_date']
            mission.description = data.get('description', '')
            mission.phases = data.get('phases', [])
            mission.save()
        else:
            mission = Mission.objects.create(
                name=data['name'],
                habitat_type=data['habitat_type'],
                duration_days=data['duration_days'],
                start_date=data['start_date'],
                description=data.get('description', ''),
                phases=data.get('phases', [])
            )

        mission.crew_members.clear()

        for crew_data in data.get('crew_members', []):
            user = User.objects.get(id=crew_data['user_id'])

            if hasattr(user, 'perfil_pwms'):
                user.perfil_pwms.role = crew_data.get('role') or user.perfil_pwms.role
                user.perfil_pwms.save()

            mission.crew_members.add(user)

        return JsonResponse({'success': True, 'mission_id': mission.id})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@csrf_exempt
def api_delete_mission(request, mission_id):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        mission = get_object_or_404(Mission, id=mission_id)
        mission.delete()
        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


def heatmap_view(request, mission_id):
    mission = get_object_or_404(Mission, id=mission_id)
    return render(request, 'heatmap.html', {'mission': mission})

def heatmap_data_api(request, mission_id):
    try:
        mission = get_object_or_404(Mission, id=mission_id)
        crew_members = mission.crew_members.all()
        start_date = mission.start_date
        duration = mission.duration_days
        
        # Generar lista de días
        date_labels = []
        day_numbers = []
        dates_list = []
        for i in range(duration):
            current_date = start_date + timedelta(days=i)
            date_labels.append(current_date.strftime('%Y-%m-%d'))
            day_numbers.append(i + 1)
            dates_list.append(current_date)
        
        heatmap_data = {
            'mission_name': mission.name,
            'crew_members': [],
            'dates': date_labels,
            'day_numbers': day_numbers
        }
        
        for crew in crew_members:
            stress_data = []
            anxiety_data = []
            workload_data = []
            
            # Obtener TODOS los registros de ansiedad de este tripulante
            all_zung = ZungAnxietyScale.objects.filter(usuario=crew).order_by('fecha_registro')
            
            # Crear un diccionario para mapear fecha -> valor de ansiedad
            anxiety_by_date = {}
            for z in all_zung:
                if z.fecha_registro and z.puntuacion_indice:
                    fecha_key = z.fecha_registro.date()
                    # Normalizar de 25-100 a 1-10
                    anxiety_value = ((z.puntuacion_indice - 25) / 75) * 9 + 1
                    anxiety_by_date[fecha_key] = round(anxiety_value, 1)
            
            # Obtener TODOS los registros de estrés
            all_stress = RegistroFisiologico.objects.filter(usuario=crew).order_by('fecha')
            stress_by_date = {}
            for r in all_stress:
                if r.fecha and r.nivel_estres is not None:
                    fecha_key = r.fecha.date()
                    stress_by_date[fecha_key] = float(r.nivel_estres)
                elif r.fecha and r.frecuencia_cardiaca:
                    fecha_key = r.fecha.date()
                    hr = r.frecuencia_cardiaca
                    if hr < 70:
                        stress_by_date[fecha_key] = 2.0
                    elif hr < 90:
                        stress_by_date[fecha_key] = 4.0
                    elif hr < 110:
                        stress_by_date[fecha_key] = 7.0
                    else:
                        stress_by_date[fecha_key] = 9.0
            
            # Obtener TODOS los registros de NASA-TLX
            all_nasa = EvaluacionNASATLX.objects.filter(usuario=crew).order_by('fecha_creacion')
            workload_by_date = {}
            for n in all_nasa:
                if n.fecha_creacion and n.puntuacion_total:
                    fecha_key = n.fecha_creacion.date()
                    workload_by_date[fecha_key] = float(n.puntuacion_total)
            
            # Para cada día de la misión, buscar el valor más cercano
            for i, current_date in enumerate(dates_list):
                # Buscar ansiedad en este día o el más cercano
                anxiety_val = None
                # Primero buscar exactamente en la fecha
                if current_date in anxiety_by_date:
                    anxiety_val = anxiety_by_date[current_date]
                else:
                    # Buscar el registro más cercano (dentro de 3 días)
                    closest_date = None
                    closest_diff = 999
                    for adate in anxiety_by_date.keys():
                        diff = abs((adate - current_date).days)
                        if diff < closest_diff and diff <= 3:
                            closest_diff = diff
                            closest_date = adate
                    if closest_date:
                        anxiety_val = anxiety_by_date[closest_date]
                
                # Buscar estrés
                stress_val = None
                if current_date in stress_by_date:
                    stress_val = stress_by_date[current_date]
                else:
                    closest_date = None
                    closest_diff = 999
                    for sdate in stress_by_date.keys():
                        diff = abs((sdate - current_date).days)
                        if diff < closest_diff and diff <= 3:
                            closest_diff = diff
                            closest_date = sdate
                    if closest_date:
                        stress_val = stress_by_date[closest_date]
                
                # Buscar carga de trabajo
                workload_val = None
                if current_date in workload_by_date:
                    workload_val = workload_by_date[current_date]
                else:
                    closest_date = None
                    closest_diff = 999
                    for wdate in workload_by_date.keys():
                        diff = abs((wdate - current_date).days)
                        if diff < closest_diff and diff <= 3:
                            closest_diff = diff
                            closest_date = wdate
                    if closest_date:
                        workload_val = workload_by_date[closest_date]
                
                stress_data.append(stress_val)
                anxiety_data.append(anxiety_val)
                workload_data.append(workload_val)
            
            # Obtener rol del perfil
            role = 'Tripulante'
            if hasattr(crew, 'perfil_pwms') and crew.perfil_pwms:
                role = crew.perfil_pwms.role or 'Tripulante'
            
            heatmap_data['crew_members'].append({
                'username': crew.username,
                'role': role,
                'stress': stress_data,
                'anxiety': anxiety_data,
                'workload': workload_data
            })
        
        return JsonResponse(heatmap_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)