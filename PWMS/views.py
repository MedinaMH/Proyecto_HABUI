from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.urls import reverse
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg, Max, Min, Sum, Count
from datetime import datetime, timedelta
from django.views.decorators.cache import never_cache
import json, time
from django.utils import timezone 
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import csv
import io
import os

# ===== VISTAS DE AUTENTICACIÓN =====
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
            Session.objects.filter(session_key=request.session.session_key).delete()
        except:
            pass
    
    # 3. Eliminar TODAS las sesiones de ESTE usuario
    if user_id:
        try:
            # Buscar todas las sesiones activas
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
    from django.urls import reverse
    
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
    """Dashboard principal - requiere login"""
    return render(request, 'PWMS/dashboard.html', {
        'usuario': request.user,
        'perfil': request.user.perfil_pwms
    })
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    return response

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

# ===== VISTAS DE REGISTROS Y GRÁFICAS =====
@never_cache
@login_required
def nuevo_registro_psicologico(request):
    """Nuevo registro psicológico - versión simple"""
    return render(request, 'PWMS/nuevo_registro_psicologico.html', {
        'titulo': 'Nuevo Registro Psicológico'
    })

@never_cache
@login_required
def nuevo_registro_fisiologico(request):
    """Nuevo registro fisiológico - versión simple"""
    return render(request, 'PWMS/nuevo_registro_fisiologico.html', {
        'titulo': 'Nuevo Registro Fisiológico'
    })

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
        
        # 6. Guardar en RegistroFisiologico
        try:
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
                
                # Fecha del registro (convertir string a datetime si es necesario)
                fecha=timezone.now(),  # O usar data.get('fecha') si viene en formato correcto
                
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
        
        # 7. También guardar en un "historial" si tienes modelo separado
        # (Opcional: si quieres un modelo específico para historial)
        try:
            # Si tienes un modelo HistorialFisiologico, descomenta:
            # HistorialFisiologico.objects.create(
            #     usuario=user,
            #     registro=registro,
            #     tipo_registro='android',
            #     datos_completos=json.dumps(data)
            # )
            pass
            
        except Exception as hist_error:
            print(f"   ⚠️ Error creando historial: {hist_error}")
            # No fallar si el historial falla, el registro principal ya está guardado
        
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
def historial_psicologico(request):
    """Historial psicológico - versión simple"""
    return render(request, 'PWMS/historial_psicologico.html', {
        'titulo': 'Historial Psicológico',
        'registros': []
    })

@never_cache
@login_required
def historial_fisiologico(request):
    """Historial fisiológico - versión simple"""
    return render(request, 'PWMS/historial_fisiologico.html', {
        'titulo': 'Historial Fisiológico',
        'registros': []
    })

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
    
@never_cache
@login_required
def perfil(request):
    """Nuevo registro psicológico - versión simple"""
    return render(request, 'PWMS/perfil.html', {
        'titulo': 'Mi Perfil'
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
        
        
# Añadir en views.py
@login_required
def descargar_csv_healthsync(request):
    """
    Vista para descargar el CSV generado
    URL: /pwms/descargar-csv-healthsync/
    """
    try:
        username_clean = request.user.username.replace(' ', '_').lower()
        csv_filename = f"health_data_{username_clean}.csv"
        csv_path = os.path.join('media', 'csv_healthsync', csv_filename)
        
        if os.path.exists(csv_path):
            with open(csv_path, 'rb') as csvfile:
                response = HttpResponse(csvfile.read(), content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="{csv_filename}"'
                return response
        else:
            messages.error(request, 'No hay datos CSV disponibles')
            return redirect('PWMS:pwms_dashboard')
            
    except Exception as e:
        messages.error(request, f'Error descargando CSV: {str(e)}')
        return redirect('PWMS:pwms_dashboard')