from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
import json
import os
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from django.http import JsonResponse

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import NASATLXForm, ZungAnxietyScaleForm
from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico, SesionGrabacionNASATLX, FrameNASATLX, EvaluacionNASATLX, Mission, ZungAnxietyScale
from .serializers import (UserSerializer, PerfilSerializer, LoginSerializer, RegistroPsicologicoSerializer,
    RegistroFisiologicoSerializer)
from django.views.decorators.csrf import csrf_exempt
import xml.etree.ElementTree as ET
from django.http import HttpResponse
from datetime import date


# ===== API DE AUTENTICACIÓN =====

class HealthSyncLoginAPI(APIView):
    """
    API para login desde HealthSync Pro
    URL: /api/healthsync/login/
    Método: POST
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            username = serializer.validated_data['username']
            pin = serializer.validated_data['pin']
            
            try:
                user = User.objects.get(username=username)
                
                # Verificar PIN
                if hasattr(user, 'perfil_pwms') and user.perfil_pwms.pin == pin:
                    # Crear o obtener token
                    token, created = Token.objects.get_or_create(user=user)
                    
                    # Verificar si el perfil está completo
                    perfil_completo = self.verificar_perfil_completo(user)
                    
                    return Response({
                        'status': 'success',
                        'message': 'Login exitoso',
                        'token': token.key,
                        'user_id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'perfil_completo': perfil_completo,
                        'primer_login': not perfil_completo,
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'status': 'error',
                        'message': 'PIN incorrecto'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                    
            except User.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Usuario no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'status': 'error',
            'message': 'Datos inválidos',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def verificar_perfil_completo(self, user):
        """Verifica si el perfil está completo"""
        try:
            perfil = user.perfil_pwms
            campos_obligatorios = ['telefono', 'fecha_nacimiento', 'genero']
            for campo in campos_obligatorios:
                valor = getattr(perfil, campo)
                if not valor or valor == '':
                    return False
            return True
        except PerfilPWMS.DoesNotExist:
            return False

class HealthSyncRegisterAPI(APIView):
    """
    API para registro desde HealthSync Pro
    URL: /api/healthsync/register/
    Método: POST
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            with transaction.atomic():
                # Validar datos
                username = request.data.get('username', '').strip()
                email = request.data.get('email', '').strip()
                password = request.data.get('password', '').strip()
                pin = request.data.get('pin', '').strip()
                
                # Validaciones básicas
                if not username or not email or not password or not pin:
                    return Response({
                        'status': 'error',
                        'message': 'Todos los campos son obligatorios'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if len(pin) != 4 or not pin.isdigit():
                    return Response({
                        'status': 'error',
                        'message': 'El PIN debe tener 4 dígitos numéricos'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Verificar si el usuario ya existe
                if User.objects.filter(username=username).exists():
                    return Response({
                        'status': 'error',
                        'message': 'El nombre de usuario ya está en uso'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if User.objects.filter(email=email).exists():
                    return Response({
                        'status': 'error', 
                        'message': 'El correo electrónico ya está registrado'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Crear usuario
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
                
                # Actualizar PIN en el perfil
                perfil = user.perfil_pwms
                perfil.pin = pin
                perfil.save()
                
                # Crear token
                token = Token.objects.create(user=user)
                
                return Response({
                    'status': 'success',
                    'message': 'Usuario registrado exitosamente',
                    'token': token.key,
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'perfil_completo': False,
                    'primer_login': True
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Error en el registro: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HealthSyncLogoutAPI(APIView):
    """
    API para logout desde HealthSync Pro
    URL: /api/healthsync/logout/
    Método: POST
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Eliminar token
            request.user.auth_token.delete()
            return Response({
                'status': 'success',
                'message': 'Sesión cerrada exitosamente'
            }, status=status.HTTP_200_OK)
        except:
            return Response({
                'status': 'error',
                'message': 'Error al cerrar sesión'
            }, status=status.HTTP_400_BAD_REQUEST)

# ===== API DE PERFIL =====

class HealthSyncPerfilAPI(APIView):
    """
    API para obtener y actualizar perfil desde HealthSync Pro
    URL: /api/healthsync/perfil/
    Métodos: GET, PUT, PATCH
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Obtener perfil del usuario"""
        try:
            perfil = request.user.perfil_pwms
            serializer = PerfilSerializer(perfil)
            
            # Verificar campos obligatorios
            campos_faltantes = []
            campos_obligatorios = ['telefono', 'fecha_nacimiento', 'genero']
            for campo in campos_obligatorios:
                valor = getattr(perfil, campo)
                if not valor or valor == '':
                    campos_faltantes.append(campo)
            
            return Response({
                'status': 'success',
                'perfil': serializer.data,
                'perfil_completo': len(campos_faltantes) == 0,
                'campos_faltantes': campos_faltantes,
                'campos_obligatorios': campos_obligatorios
            }, status=status.HTTP_200_OK)
            
        except PerfilPWMS.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Perfil no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        """Actualizar perfil completo"""
        try:
            perfil = request.user.perfil_pwms
            serializer = PerfilSerializer(perfil, data=request.data)
            
            if serializer.is_valid():
                serializer.save()
                
                # Verificar si ahora está completo
                perfil_completo = self.verificar_perfil_completo(request.user)
                
                return Response({
                    'status': 'success',
                    'message': 'Perfil actualizado exitosamente',
                    'perfil': serializer.data,
                    'perfil_completo': perfil_completo
                }, status=status.HTTP_200_OK)
            
            return Response({
                'status': 'error',
                'message': 'Error en los datos',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except PerfilPWMS.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Perfil no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request):
        """Actualizar parcialmente el perfil"""
        try:
            perfil = request.user.perfil_pwms
            serializer = PerfilSerializer(perfil, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                
                # Verificar si ahora está completo
                perfil_completo = self.verificar_perfil_completo(request.user)
                
                return Response({
                    'status': 'success',
                    'message': 'Perfil actualizado exitosamente',
                    'perfil': serializer.data,
                    'perfil_completo': perfil_completo
                }, status=status.HTTP_200_OK)
            
            return Response({
                'status': 'error',
                'message': 'Error en los datos',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except PerfilPWMS.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Perfil no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def verificar_perfil_completo(self, user):
        """Verifica si el perfil está completo"""
        try:
            perfil = user.perfil_pwms
            campos_obligatorios = ['telefono', 'fecha_nacimiento', 'genero']
            for campo in campos_obligatorios:
                valor = getattr(perfil, campo)
                if not valor or valor == '':
                    return False
            return True
        except PerfilPWMS.DoesNotExist:
            return False

# ===== API DE REGISTROS =====

class HealthSyncRegistroPsicologicoAPI(APIView):
    """
    API para registrar datos psicológicos desde HealthSync Pro
    URL: /api/healthsync/registro/psicologico/
    Método: POST
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = RegistroPsicologicoSerializer(data=request.data)
        
        if serializer.is_valid():
            # Agregar usuario al registro
            registro = serializer.save(usuario=request.user, creado_por=request.user)
            
            return Response({
                'status': 'success',
                'message': 'Registro psicológico guardado exitosamente',
                'registro_id': registro.id,
                'fecha': registro.fecha
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'status': 'error',
            'message': 'Error en los datos',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        """Obtener últimos registros psicológicos"""
        registros = RegistroPsicologico.objects.filter(usuario=request.user).order_by('-fecha')[:10]
        serializer = RegistroPsicologicoSerializer(registros, many=True)
        
        return Response({
            'status': 'success',
            'registros': serializer.data,
            'total': registros.count()
        }, status=status.HTTP_200_OK)


@login_required
def nasa_tlx_create(request):
    if request.method == 'POST':
        form = NASATLXForm(request.POST)
        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            evaluacion.save()
            
            # Procesar video si se recibió
            video_path = request.POST.get('video_path')
            if video_path and SesionGrabacionNASATLX is not None:
                try:
                    SesionGrabacionNASATLX.objects.create(
                        evaluacion=evaluacion,
                        usuario=request.user,
                        archivo_video=video_path,
                        nombre_video=os.path.basename(video_path),
                        duracion_segundos=120,
                        completada=True
                    )
                except Exception as e:
                    print(f"Error al guardar sesión de video: {e}")
            
            return redirect('PWMS:nasa_tlx_resultado', pk=evaluacion.id)
        else:
            print("Errores del formulario:", form.errors)
    else:
        form = NASATLXForm()
    
    return render(request, 'PWMS/nasa_tlx_form.html', {'form': form})

@login_required
@csrf_exempt
def guardar_video_nasa_tlx(request):
    """
    Vista para guardar videos de las sesiones NASA TLX
    """
    if request.method == 'POST':
        try:
            if not request.FILES.get('video'):
                return JsonResponse({'success': False, 'error': 'No se recibió video'}, status=400)
            
            video = request.FILES['video']
            timestamp = int(timezone.now().timestamp())
            username = request.user.username
            filename = f"videos_nasa_tlx/{username}_{timestamp}.webm"
            
            # Crear directorio si no existe
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'videos_nasa_tlx')
            os.makedirs(upload_dir, exist_ok=True)
            
            # Guardar archivo
            path = default_storage.save(filename, ContentFile(video.read()))
            file_url = default_storage.url(path)
            
            return JsonResponse({
                'success': True,
                'video_path': file_url,
                'message': 'Video guardado correctamente'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
@login_required
def nasa_tlx_resultado(request, pk):
    evaluacion = get_object_or_404(EvaluacionNASATLX, pk=pk, usuario=request.user)
    
    # Interpretación NASA TLX
    if evaluacion.puntuacion_total < 30:
        color = "success"
        icono = "bi-emoji-smile"
        interpretacion = "Carga Mental BAJA"
    elif evaluacion.puntuacion_total < 60:
        color = "warning"
        icono = "bi-emoji-neutral"
        interpretacion = "Carga Mental MODERADA"
    else:
        color = "danger"
        icono = "bi-emoji-frown"
        interpretacion = "Carga Mental ALTA"
    
    # Preparar datos para la tabla de dimensiones
    dimensiones = [
        {'dimension': 'Demanda Mental', 'puntuacion': evaluacion.demanda_mental, 'peso': evaluacion.peso_demanda_mental},
        {'dimension': 'Demanda Física', 'puntuacion': evaluacion.demanda_fisica, 'peso': evaluacion.peso_demanda_fisica},
        {'dimension': 'Demanda Temporal', 'puntuacion': evaluacion.demanda_temporal, 'peso': evaluacion.peso_demanda_temporal},
        {'dimension': 'Rendimiento', 'puntuacion': evaluacion.rendimiento, 'peso': evaluacion.peso_rendimiento},
        {'dimension': 'Esfuerzo', 'puntuacion': evaluacion.esfuerzo, 'peso': evaluacion.peso_esfuerzo},
        {'dimension': 'Frustración', 'puntuacion': evaluacion.frustracion, 'peso': evaluacion.peso_frustracion},
    ]
    
    context = {
        'evaluacion': evaluacion,
        'dimensiones': dimensiones,
        'color': color,
        'icono': icono,
        'interpretacion': interpretacion,
    }
    
    return render(request, 'PWMS/nasa_tlx_resultado.html', context)

@login_required
def nasa_tlx_historial(request):
    # Obtener todas las evaluaciones del usuario
    evaluaciones = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion')
    
    # Estadísticas generales
    total_evaluaciones = evaluaciones.count()
    
    # Promedio de carga mental
    if total_evaluaciones > 0:
        promedio_carga = round(sum(e.puntuacion_total for e in evaluaciones) / total_evaluaciones, 1)
    else:
        promedio_carga = 0
    
    # Días con registros (únicos)
    dias_con_registros = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).dates('fecha_creacion', 'day').count()
    
    context = {
        'evaluaciones': evaluaciones,
        'total_evaluaciones': total_evaluaciones,
        'promedio_carga': promedio_carga,
        'dias_con_registros': dias_con_registros,
    }
    
    return render(request, 'PWMS/nasa_tlx_historial.html', context)

@login_required
def zung_anxiety_nuevo(request):
    if request.method == 'POST':
        form = ZungAnxietyScaleForm(request.POST)
        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            evaluacion.save()
            
            # ===== GUARDAR DATOS DEL VIDEO =====
            video_path = request.POST.get('video_path')
            if video_path:
                evaluacion.video_path = video_path
                
                # Metadatos (vienen como JSON string)
                metadata_str = request.POST.get('video_metadata')
                if metadata_str:
                    try:
                        evaluacion.video_metadata = json.loads(metadata_str)
                    except:
                        pass
                
                # Tamaño del video
                size_str = request.POST.get('video_size')
                if size_str:
                    try:
                        evaluacion.video_size = int(size_str)
                    except:
                        pass
                
                # Duración (siempre 120 segundos por ahora)
                evaluacion.video_duration = 120
                
                evaluacion.save()
            
            return redirect('PWMS:zung_anxiety_resultados', pk=evaluacion.id)
        else:
            print("Errores:", form.errors)
    else:
        form = ZungAnxietyScaleForm()
    
    return render(request, 'PWMS/zung_anxiety_nuevo.html', {'form': form})

# ===== VISTA PARA RESULTADOS (MODIFICADA PARA MOSTRAR VIDEO) =====
@login_required
def zung_anxiety_resultados(request, pk):
    evaluacion = get_object_or_404(ZungAnxietyScale, pk=pk, usuario=request.user)
    
    context = {
        'evaluacion': evaluacion,
        'puntuacion_bruta': evaluacion.puntuacion_bruta,
        'puntuacion_indice': evaluacion.puntuacion_indice,
        'nivel_ansiedad': evaluacion.get_nivel_ansiedad_display(),
    }
    return render(request, 'PWMS/zung_anxiety_resultados.html', context)

# ===== VISTA PARA GUARDAR VIDEO (SIN LOGGER, CON PRINTS) =====
@login_required
@csrf_exempt
def guardar_video_zung(request):
    if request.method == 'POST':
        try:
            if not request.FILES.get('video'):
                return JsonResponse({'success': False, 'error': 'No se recibió video'}, status=400)
            
            video = request.FILES['video']
            timestamp = int(timezone.now().timestamp())
            username = request.user.username
            filename = f"videos_zung/{username}_{timestamp}.webm"
            
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'videos_zung')
            os.makedirs(upload_dir, exist_ok=True)
            
            path = default_storage.save(filename, ContentFile(video.read()))
            file_url = default_storage.url(path)
            
            # Obtener metadatos
            metadata = None
            if request.POST.get('metadata'):
                try:
                    metadata = json.loads(request.POST.get('metadata'))
                except:
                    metadata = {'error': 'No se pudo parsear'}
            
            # Tamaño del archivo
            file_path = os.path.join(settings.MEDIA_ROOT, path)
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            
            print(f"✅ Video Zung guardado: {path}, tamaño: {file_size} bytes, usuario: {request.user.username}")
            if metadata:
                print(f"📷 Metadatos: {metadata}")
            
            return JsonResponse({
                'success': True,
                'video_path': file_url,
                'file_name': os.path.basename(path),
                'file_size': file_size,
                'metadata': metadata,
                'message': 'Video guardado correctamente'
            })
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


# ===== API DE REGISTROS =====
class HealthSyncRegistroFisiologicoAPI(APIView):
    """
    API para registrar datos fisiológicos desde HealthSync Pro 
    URL: /api/healthsync/save/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Copiar datos
        data = request.data.copy()
        
        # ⭐⭐ ELIMINAR CAMPOS TEMPORALES DE SUEÑO ⭐⭐
        # Estos campos NO existen en el modelo y causan error
        horas = None
        minutos = None
        
        if 'horas_sueno_horas' in data:
            horas = float(data['horas_sueno_horas'])
            print(f"   🕐 Horas sueño (horas): {horas}")
            del data['horas_sueno_horas']
        
        if 'horas_sueno_minutos' in data:
            minutos = float(data['horas_sueno_minutos'])
            print(f"   🕐 Horas sueño (minutos): {minutos}")
            del data['horas_sueno_minutos']
        
        # Calcular horas de sueño totales
        if horas is not None and minutos is not None:
            data['horas_sueno'] = horas + (minutos / 60.0)
            print(f"   ⏰ Total horas sueño: {data['horas_sueno']}")
        elif horas is not None:
            data['horas_sueno'] = horas
        elif minutos is not None:
            data['horas_sueno'] = minutos / 60.0
        
        print("\n" + "="*80)
        print("📱 DATOS RECIBIDOS DESDE ANDROID:")
        print("="*80)
        print(f"👤 Usuario: {request.user.username}")
        
        for key, value in request.data.items():
            print(f"   {key}: {value}")
        
        # ⭐⭐ 1. PROCESAR FECHA - VERSIÓN CORREGIDA ⭐⭐
        if 'fecha_hora' in data:
            fecha_str = data['fecha_hora']
            print(f"\n📅 FECHA RECIBIDA: {fecha_str}")
            
            try:
                # Parsear la fecha
                fecha_parsed = datetime.strptime(fecha_str, '%Y-%m-%dT%H:%M:%S')
                print(f"⏰ Hora parseada: {fecha_parsed.hour:02d}:{fecha_parsed.minute:02d}")
                
                # Asignar zona horaria de México (NO UTC)
                import pytz
                mexico_tz = pytz.timezone('America/Mexico_City')
                
                # La fecha del Android es hora local de México
                fecha_local = mexico_tz.localize(fecha_parsed)
                
                # Guardar en el campo 'fecha' del modelo
                data['fecha'] = fecha_local
                print(f"✅ Fecha guardada (local México): {fecha_local.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"   En UTC (BD): {fecha_local.astimezone(pytz.UTC).strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Eliminar el campo original
                del data['fecha_hora']
                
            except Exception as e:
                print(f"❌ Error procesando fecha: {e}")
                data['fecha'] = timezone.now()
        else:
            print("❌ NO se recibió 'fecha_hora'")
            data['fecha'] = timezone.now()
        
        # ⭐⭐ 2. VERIFICAR CAMPOS REQUERIDOS ⭐⭐
        print("\n🔍 VERIFICANDO CAMPOS REQUERIDOS:")
        campos_requeridos = ['frecuencia_cardiaca', 'presion_arterial_sistolica',
                            'presion_arterial_diastolica', 'temperatura', 'oxigenacion_sangre']
        
        for campo in campos_requeridos:
            if campo in data:
                print(f"   ✅ {campo}: PRESENTE = {data[campo]}")
            else:
                print(f"   ❌ {campo}: AUSENTE (usando 0)")
                data[campo] = 0
        
        # ⭐⭐ 3. MAPEAR CAMPOS DE ESTRÉS (de stress_* a estres_*) ⭐⭐
        mapeo_estres = {
            'stress_relaxed': 'estres_relajado',
            'stress_low': 'estres_bajo',
            'stress_moderate': 'estres_moderado',
            'stress_high': 'estres_alto'
        }
        
        for android_field, django_field in mapeo_estres.items():
            if android_field in data:
                data[django_field] = data[android_field]
                print(f"   🔄 Mapeado: {android_field} → {django_field} = {data[android_field]}")
                # No eliminamos el original por si acaso
        
        print("\n📋 DATOS FINALES PARA SERIALIZADOR:")
        for key in sorted(data.keys()):
            print(f"   📌 {key}: {data[key]}")
        
        print("="*80)
        
        # ⭐⭐ 4. PROCESAR CON EL SERIALIZADOR ⭐⭐
        serializer = RegistroFisiologicoSerializer(data=data)
        
        if serializer.is_valid():
            registro = serializer.save(usuario=request.user)
            
            print("\n" + "🎉" * 30)
            print("✅ REGISTRO GUARDADO EXITOSAMENTE!")
            print("🎉" * 30)
            print(f"   🆔 ID: {registro.id}")
            print(f"   📅 Fecha: {registro.fecha}")
            print(f"   😴 Horas sueño: {registro.horas_sueno}")
            print(f"   ❤️ FC: {registro.frecuencia_cardiaca}")
            
            return Response({
                'status': 'success',
                'message': 'Datos guardados exitosamente',
                'registro_id': registro.id,
                'fecha_guardada': timezone.localtime(registro.fecha).strftime('%Y-%m-%d %H:%M:%S'),
                'horas_sueno': float(registro.horas_sueno) if registro.horas_sueno else None
            }, status=status.HTTP_201_CREATED)
        
        # ⭐⭐ 5. SI HAY ERRORES ⭐⭐
        print("\n" + "❌" * 30)
        print("ERROR EN EL SERIALIZADOR")
        print("❌" * 30)
        print(f"   Errores: {serializer.errors}")
        
        return Response({
            'status': 'error',
            'message': 'Error en los datos',
            'errors': serializer.errors,
            'debug': {
                'campos_recibidos': list(request.data.keys()),
                'campos_procesados': list(data.keys())
            }
        }, status=status.HTTP_400_BAD_REQUEST)

# ===== API DE DASHBOARD =====

class HealthSyncDashboardAPI(APIView):
    """
    API para obtener datos del dashboard desde HealthSync Pro
    URL: /api/healthsync/dashboard/
    Método: GET
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Verificar perfil
            perfil_completo = self.verificar_perfil_completo(request.user)
            
            if not perfil_completo:
                return Response({
                    'status': 'warning',
                    'message': 'Perfil incompleto. Por favor completa tu perfil.',
                    'perfil_completo': False
                }, status=status.HTTP_200_OK)
            
            # Obtener estadísticas
            registros_psico = RegistroPsicologico.objects.filter(
                usuario=request.user
            ).order_by('-fecha')[:5]
            
            registros_fisio = RegistroFisiologico.objects.filter(
                usuario=request.user
            ).order_by('-fecha')[:5]
            
            # Serializar datos
            psico_serializer = RegistroPsicologicoSerializer(registros_psico, many=True)
            fisio_serializer = RegistroFisiologicoSerializer(registros_fisio, many=True)
            
            # Calcular promedios
            promedios_psico = RegistroPsicologico.objects.filter(
                usuario=request.user
            ).aggregate(
                avg_estres=Avg('nivel_estres'),
                avg_ansiedad=Avg('nivel_ansiedad'),
                avg_animo=Avg('estado_animo')
            )
            
            promedios_fisio = RegistroFisiologico.objects.filter(
                usuario=request.user
            ).aggregate(
                avg_fc=Avg('frecuencia_cardiaca'),
                avg_presion_sis=Avg('presion_arterial_sistolica'),
                avg_presion_dia=Avg('presion_arterial_diastolica'),
                avg_temp=Avg('temperatura'),
                avg_spo2=Avg('oxigenacion_sangre')
            )
            
            return Response({
                'status': 'success',
                'perfil_completo': True,
                'registros_recientes': {
                    'psicologicos': psico_serializer.data,
                    'fisiologicos': fisio_serializer.data
                },
                'estadisticas': {
                    'psicologicas': {
                        'estres_promedio': round(promedios_psico.get('avg_estres', 0), 1),
                        'ansiedad_promedio': round(promedios_psico.get('avg_ansiedad', 0), 1),
                        'animo_promedio': round(promedios_psico.get('avg_animo', 0), 1)
                    },
                    'fisiologicas': {
                        'fc_promedio': round(promedios_fisio.get('avg_fc', 0), 1),
                        'presion_sis_promedio': round(promedios_fisio.get('avg_presion_sis', 0), 1),
                        'presion_dia_promedio': round(promedios_fisio.get('avg_presion_dia', 0), 1),
                        'temp_promedio': round(promedios_fisio.get('avg_temp', 0), 1),
                        'spo2_promedio': round(promedios_fisio.get('avg_spo2', 0), 1)
                    }
                },
                'usuario': {
                    'username': request.user.username,
                    'email': request.user.email,
                    'fecha_registro': request.user.date_joined
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Error al obtener datos: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def verificar_perfil_completo(self, user):
        """Verifica si el perfil está completo"""
        try:
            perfil = user.perfil_pwms
            campos_obligatorios = ['telefono', 'fecha_nacimiento', 'genero']
            for campo in campos_obligatorios:
                valor = getattr(perfil, campo)
                if not valor or valor == '':
                    return False
            return True
        except PerfilPWMS.DoesNotExist:
            return False


# ===== ALIAS PARA COMPATIBILIDAD CON APP ANDROID =====

class HealthSyncSaveDataAPI(HealthSyncRegistroFisiologicoAPI):
    """
    Alias para HealthSyncRegistroFisiologicoAPI
    Mantiene compatibilidad con la app Android que usa /save/
    """
    pass

# ===== API DE VERIFICACIÓN =====

@api_view(['GET'])
@permission_classes([AllowAny])
def healthsync_status_api(request):
    """
    API para verificar estado del servidor
    URL: /api/healthsync/status/
    """
    return Response({
        'status': 'online',
        'service': 'HealthSync Pro API',
        'version': '1.0.0',
        'timestamp': timezone.now().isoformat()
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def healthsync_verify_token_api(request):
    """
    API para verificar validez del token
    URL: /api/healthsync/verify-token/
    """
    return Response({
        'status': 'valid',
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email
        },
        'timestamp': timezone.now().isoformat()
    }, status=status.HTTP_200_OK)


def export_stress_vocabulary(request, user_id):
    from django.contrib.auth.models import User
    user = User.objects.get(id=user_id)
    mission = Mission.objects.filter(crew_members=user).first()
    if not mission:
        # crear una misión por defecto si no existe
        mission = Mission.objects.create(
            name="Default Mission",
            habitat_type="Unknown",
            duration_days=0,
            phases=[],
            start_date=date.today()
        )
        mission.crew_members.add(user)
    
    # Agrupar datos por día
    registros_psico = RegistroPsicologico.objects.filter(usuario=user).order_by('fecha')
    registros_fisio = RegistroFisiologico.objects.filter(usuario=user).order_by('fecha')
    evaluaciones_tlx = EvaluacionNASATLX.objects.filter(usuario=user).order_by('fecha_creacion')
    zung_tests = ZungAnxietyScale.objects.filter(usuario=user).order_by('fecha_registro')
    
    by_day = {}
    for r in registros_psico:
        by_day.setdefault(r.fecha.date(), {})['psico'] = r
    for r in registros_fisio:
        by_day.setdefault(r.fecha.date(), {})['fisio'] = r
    for t in evaluaciones_tlx:
        by_day.setdefault(t.fecha_creacion.date(), {})['tlx'] = t
    for z in zung_tests:
        by_day.setdefault(z.fecha_registro.date(), {})['zung'] = z
    
    root = ET.Element('AnalogCrewStudy')
    
    # Misión
    mission_elem = ET.SubElement(root, 'Mission')
    ET.SubElement(mission_elem, 'MissionName').text = mission.name
    ET.SubElement(mission_elem, 'HabitatType').text = mission.habitat_type
    ET.SubElement(mission_elem, 'Duration').text = str(mission.duration_days)
    for phase in mission.phases:
        p = ET.SubElement(mission_elem, 'Phase')
        ET.SubElement(p, 'PhaseName').text = phase.get('name', '')
        ET.SubElement(p, 'DayStart').text = str(phase.get('start', 0))
        ET.SubElement(p, 'DayEnd').text = str(phase.get('end', 0))
    
    # Tripulante
    perfil = user.perfil_pwms
    crew = ET.SubElement(root, 'CrewMember', role=perfil.role or 'Scientist')
    ET.SubElement(crew, 'CrewID').text = user.username
    demo = ET.SubElement(crew, 'Demographics')
    if perfil.fecha_nacimiento:
        age = (date.today() - perfil.fecha_nacimiento).days // 365
        ET.SubElement(demo, 'Age').text = str(age)
    else:
        ET.SubElement(demo, 'Age').text = '0'
    ET.SubElement(demo, 'Gender').text = perfil.genero or 'Unknown'
    ET.SubElement(demo, 'ExperienceLevel').text = perfil.experience or 'Experienced'
    
    baseline = ET.SubElement(crew, 'BaselineMeasures')
    ET.SubElement(baseline, 'BaselineStress').text = str(perfil.baseline_stress or 0)
    ET.SubElement(baseline, 'BaselineFatigue').text = str(perfil.baseline_fatigue or 0)
    ET.SubElement(baseline, 'BaselineCognitive').text = str(perfil.baseline_cognitive or 0)
    
    # Perfil individualizado (simplificado)
    profile = ET.SubElement(crew, 'PsychologicalProfile', type='Individualized')
    ET.SubElement(profile, 'ProfileID').text = f'PROF-{user.username}'
    ET.SubElement(profile, 'TimeSegment').text = 'Full mission'
    ET.SubElement(profile, 'ProfileData').text = '{"pattern": "under development"}'
    
    # Evaluaciones diarias
    for day, data in sorted(by_day.items()):
        assess = ET.SubElement(root, 'Assessment', type='Daily', timestamp=day.isoformat())
        ET.SubElement(assess, 'AssessmentID').text = f'ASSESS-{day.strftime("%Y%m%d")}-{user.username}'
        ET.SubElement(assess, 'CrewIDRef').text = user.username
        mission_day = (day - mission.start_date).days + 1 if mission.start_date else 0
        ET.SubElement(assess, 'MissionDay').text = str(mission_day)
        
        # PsychologicalState
        ps = ET.SubElement(assess, 'PsychologicalState')
        fisio = data.get('fisio')
        if fisio:
            stress_val = (fisio.nivel_estres / 75) * 9 + 1 if fisio.nivel_estres else 5
            ET.SubElement(ps, 'MentalStress').text = f"{stress_val:.1f}"
            ET.SubElement(ps, 'MentalStrain').text = f"{stress_val:.1f}"
        else:
            ET.SubElement(ps, 'MentalStress').text = ''
            ET.SubElement(ps, 'MentalStrain').text = ''
        
        psico = data.get('psico')
        if psico:
            ET.SubElement(ps, 'PositiveAffect').text = str(psico.positive_affect if psico.positive_affect else psico.estado_animo)
            neg = psico.negative_affect if psico.negative_affect else (11 - psico.estado_animo)
            ET.SubElement(ps, 'NegativeAffect').text = str(neg)
            ET.SubElement(ps, 'FatigueLevel').text = str(psico.fatiga) if psico.fatiga else ''
        else:
            ET.SubElement(ps, 'PositiveAffect').text = ''
            ET.SubElement(ps, 'NegativeAffect').text = ''
            ET.SubElement(ps, 'FatigueLevel').text = ''
        
        zung = data.get('zung')
        if zung:
            anxiety_val = ((zung.puntuacion_indice - 25) / 75) * 9 + 1 if zung.puntuacion_indice else 5
            ET.SubElement(ps, 'Anxiety').text = f"{anxiety_val:.1f}"
        else:
            ET.SubElement(ps, 'Anxiety').text = ''
        
        # WorkloadMetrics
        tlx = data.get('tlx')
        wl = ET.SubElement(assess, 'WorkloadMetrics')
        if tlx:
            ET.SubElement(wl, 'MentalWorkload').text = f"{tlx.demanda_mental / 10:.1f}"
            ET.SubElement(wl, 'PhysicalWorkload').text = f"{tlx.demanda_fisica / 10:.1f}"
            ET.SubElement(wl, 'TaskDifficulty').text = f"{tlx.demanda_temporal / 10:.1f}"
            ET.SubElement(wl, 'CognitivePerformance').text = f"{tlx.rendimiento / 10:.1f}"
        else:
            ET.SubElement(wl, 'MentalWorkload').text = ''
            ET.SubElement(wl, 'PhysicalWorkload').text = ''
            ET.SubElement(wl, 'TaskDifficulty').text = ''
            ET.SubElement(wl, 'CognitivePerformance').text = ''
        
        # SocialFactors y HabitatPerception (vacíos)
        sf = ET.SubElement(assess, 'SocialFactors')
        ET.SubElement(sf, 'SocialSupport').text = ''
        ET.SubElement(sf, 'TeamCohesion').text = ''
        ET.SubElement(sf, 'Conflict').text = ''
        ET.SubElement(sf, 'IsolationPerception').text = ''
        
        hp = ET.SubElement(assess, 'HabitatPerception')
        ET.SubElement(hp, 'Privacy').text = ''
        ET.SubElement(hp, 'Comfort').text = ''
        ET.SubElement(hp, 'Control').text = ''
        ET.SubElement(hp, 'SocialDensity').text = ''
        ET.SubElement(hp, 'HabitabilityScore').text = ''
        
        # PhysiologicalData
        pd = ET.SubElement(assess, 'PhysiologicalData')
        if fisio:
            ET.SubElement(pd, 'HeartRate').text = str(fisio.frecuencia_cardiaca)
            ET.SubElement(pd, 'SleepHours').text = str(fisio.horas_sueno)
            sleep_qual = (fisio.puntuacion_sueno / 100) * 9 + 1 if fisio.puntuacion_sueno else ''
            ET.SubElement(pd, 'SleepQuality').text = f"{sleep_qual:.1f}" if sleep_qual else ''
            ET.SubElement(pd, 'CortisolLevel').text = ''
        else:
            ET.SubElement(pd, 'HeartRate').text = ''
            ET.SubElement(pd, 'SleepHours').text = ''
            ET.SubElement(pd, 'SleepQuality').text = ''
            ET.SubElement(pd, 'CortisolLevel').text = ''
    
    xml_str = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_str += '<!DOCTYPE AnalogCrewStudy SYSTEM "analog-crew-stress.dtd">\n'
    xml_str += ET.tostring(root, encoding='unicode')
    
    response = HttpResponse(xml_str, content_type='application/xml')
    response['Content-Disposition'] = f'attachment; filename="crew_stress_{user.username}.xml"'
    return response