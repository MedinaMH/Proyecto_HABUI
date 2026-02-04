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
from datetime import datetime

from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico
from .serializers import (
    UserSerializer, PerfilSerializer, LoginSerializer, RegistroPsicologicoSerializer,
    RegistroFisiologicoSerializer
)

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

# ===== API DE REGISTROS =====

class HealthSyncRegistroFisiologicoAPI(APIView):
    """
    API para registrar datos fisiológicos desde HealthSync Pro 
    URL: /api/healthsync/registro/fisiologico/
    Método: POST
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Copiar datos
        data = request.data.copy()
        
        # ⭐⭐ MAPEO ACTUALIZADO (sin stress_level) ⭐⭐
        field_mapping = {
            # Campos principales
            'heart_rate': 'frecuencia_cardiaca',
            'systolic_pressure': 'presion_arterial_sistolica',
            'diastolic_pressure': 'presion_arterial_diastolica',
            'body_temperature': 'temperatura',
            'blood_oxygen': 'oxigenacion_sangre',
            'steps': 'pasos_diarios',
            'calories': 'calorias_quemadas',
            'sleep_hours': 'horas_sueno',
            'sleep_score': 'puntuacion_sueno',
            'device_origin': 'dispositivo_origen',
            'notes': 'notas_adicionales',
            
            # ⭐⭐ SOLO LOS 4 PORCENTAJES ⭐⭐
            'stress_relaxed': 'stress_relaxed',       # Relajado %
            'stress_low': 'stress_low',               # Bajo %
            'stress_moderate': 'stress_moderate',     # Moderado %
            'stress_high': 'stress_high',             # Alto %
            # ❌ ELIMINA 'stress_level': 'stress_level'
        }
        
        # Renombrar campos si vienen de Android
        for android_field, django_field in field_mapping.items():
            if android_field in data and django_field not in data:
                data[django_field] = data.pop(android_field)
        
        # ⭐⭐ LOG DE DEPURACIÓN ⭐⭐
        print("\n" + "="*60)
        print("📱 DATOS RECIBIDOS DESDE ANDROID (ESTRÉS):")
        print("="*60)
        
        # Solo mostrar campos de estrés
        estres_fields = ['stress_relaxed', 'stress_low', 'stress_moderate', 'stress_high']
        for field in estres_fields:
            if field in data:
                print(f"   🧘 {field}: {data[field]}%")
            else:
                print(f"   ⚠️ {field}: NO ENVIADO")
        
        print("="*60)
        
        serializer = RegistroFisiologicoSerializer(data=data)
        
        if serializer.is_valid():
            registro = serializer.save(usuario=request.user)
            
            # ⭐⭐ CALCULAR NIVEL DE ESTRÉS EN DJANGO ⭐⭐
            # (si aún quieres guardar el nivel calculado en la BD)
            registro.nivel_estres = registro.calcular_nivel_estres()
            registro.save()
            
            print("\n✅ REGISTRO GUARDADO EN DJANGO:")
            print(f"   🆔 ID: {registro.id}")
            print(f"   👤 Usuario: {request.user.username}")
            print(f"   🧘 PORCENTAJES GUARDADOS:")
            print(f"      Relajado: {registro.estres_relajado}%")
            print(f"      Bajo: {registro.estres_bajo}%")
            print(f"      Moderado: {registro.estres_moderado}%")
            print(f"      Alto: {registro.estres_alto}%")
            print(f"      ✅ Total: {registro.estres_relajado + registro.estres_bajo + registro.estres_moderado + registro.estres_alto}%")
            print(f"      🧮 Nivel calculado: {registro.nivel_estres}")
            print("="*60)
            
            # ⭐⭐ NUEVO: ACTUALIZAR CSV EN SERVIDOR ⭐⭐
            try:
                csv_actualizado = self.actualizar_csv_servidor(request.user, registro)
                
                if csv_actualizado:
                    print("✅ CSV actualizado en servidor con nuevo registro")
                    # Obtener estadísticas del CSV
                    self.mostrar_estadisticas_csv(request.user)
                else:
                    print("⚠️ No se pudo actualizar CSV en servidor")
                    
            except Exception as csv_error:
                print(f"⚠️ Error actualizando CSV: {csv_error}")
            
            return Response({
                'status': 'success',
                'message': 'Datos guardados exitosamente',
                'registro_id': registro.id,
                'csv_actualizado': True,  # ⭐ Nuevo campo
                'estres_guardado': {
                    'relajado': registro.estres_relajado,
                    'bajo': registro.estres_bajo,
                    'moderado': registro.estres_moderado,
                    'alto': registro.estres_alto,
                    'nivel_calculado': registro.nivel_estres  # Opcional
                }
            }, status=status.HTTP_201_CREATED)
        
        # ⭐⭐ LOG DE ERRORES ⭐⭐
        print("\n❌ ERROR EN DATOS RECIBIDOS:")
        print(f"   Errores: {serializer.errors}")
        print("="*60)
        
        return Response({
            'status': 'error',
            'message': 'Error en los datos',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def actualizar_csv_servidor(self, user, nuevo_registro):
        """
        Actualiza el archivo CSV existente añadiendo el nuevo registro.
        Si no existe el CSV, lo crea.
        """
        try:
            import csv
            import os
            from datetime import datetime
            
            # 1. Directorio y nombre del archivo
            csv_dir = os.path.join('uploads', 'csv_healthsync')
            os.makedirs(csv_dir, exist_ok=True)
            
            username_clean = user.username.replace(' ', '_').lower()
            csv_filename = f"health_data_{username_clean}.csv"
            csv_path = os.path.join(csv_dir, csv_filename)
            
            # 2. Preparar datos del nuevo registro para CSV
            nuevo_registro_csv = {
                'id': nuevo_registro.id,
                'fecha': nuevo_registro.fecha.strftime('%Y-%m-%d %H:%M:%S'),
                'usuario': user.username,
                'pasos_diarios': nuevo_registro.pasos_diarios,
                'frecuencia_cardiaca': nuevo_registro.frecuencia_cardiaca,
                'calorias_quemadas': nuevo_registro.calorias_quemadas,
                'presion_sistolica': nuevo_registro.presion_arterial_sistolica,
                'presion_diastolica': nuevo_registro.presion_arterial_diastolica,
                'temperatura': nuevo_registro.temperatura,
                'oxigenacion_sangre': nuevo_registro.oxigenacion_sangre,
                'horas_sueno': nuevo_registro.horas_sueno,
                'puntuacion_sueno': nuevo_registro.puntuacion_sueno,
                'estres_relajado': nuevo_registro.estres_relajado,
                'estres_bajo': nuevo_registro.estres_bajo,
                'estres_moderado': nuevo_registro.estres_moderado,
                'estres_alto': nuevo_registro.estres_alto,
                'nivel_estres_calculado': nuevo_registro.nivel_estres,
                'notas_adicionales': nuevo_registro.notas_adicionales or '',
                'dispositivo_origen': nuevo_registro.dispositivo_origen or 'Android'
            }
            
            # 3. Verificar si el archivo CSV existe
            archivo_existe = os.path.exists(csv_path)
            
            # 4. Escribir/actualizar CSV
            with open(csv_path, 'a' if archivo_existe else 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'id', 'fecha', 'usuario',
                    'pasos_diarios', 'frecuencia_cardiaca', 'calorias_quemadas',
                    'presion_sistolica', 'presion_diastolica', 'temperatura',
                    'oxigenacion_sangre', 'horas_sueno', 'puntuacion_sueno',
                    'estres_relajado', 'estres_bajo', 'estres_moderado', 'estres_alto',
                    'nivel_estres_calculado',
                    'notas_adicionales', 'dispositivo_origen'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                # Si es nuevo archivo, escribir encabezados
                if not archivo_existe:
                    writer.writeheader()
                    print(f"✅ CSV creado: {csv_path}")
                
                # Escribir el nuevo registro
                writer.writerow(nuevo_registro_csv)
            
            # 5. Log de éxito
            if archivo_existe:
                print(f"📝 CSV actualizado: Añadido registro ID {nuevo_registro.id}")
            else:
                print(f"📄 CSV creado: Primer registro ID {nuevo_registro.id}")
            
            # 6. Contar líneas en el CSV
            try:
                with open(csv_path, 'r', encoding='utf-8') as f:
                    line_count = sum(1 for line in f)
                print(f"   Total registros en CSV: {line_count - 1}")  # -1 por el header
            except:
                pass
            
            return True
            
        except Exception as e:
            print(f"❌ Error actualizando CSV: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def mostrar_estadisticas_csv(self, user):
        """Muestra estadísticas del archivo CSV"""
        try:
            import os
            csv_dir = os.path.join('media', 'csv_healthsync')
            username_clean = user.username.replace(' ', '_').lower()
            csv_filename = f"health_data_{username_clean}.csv"
            csv_path = os.path.join(csv_dir, csv_filename)
            
            if os.path.exists(csv_path):
                file_size = os.path.getsize(csv_path)
                modified_time = datetime.fromtimestamp(os.path.getmtime(csv_path))
                
                print(f"\n📊 ESTADÍSTICAS CSV:")
                print(f"   Ruta: {csv_path}")
                print(f"   Tamaño: {file_size / 1024:.2f} KB")
                print(f"   Última actualización: {modified_time}")
                
                # Contar líneas
                with open(csv_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    if lines:
                        print(f"   Total registros: {len(lines) - 1}")
                    else:
                        print(f"   CSV vacío")
        except Exception as e:
            print(f"   ⚠️ Error obteniendo estadísticas: {e}")
            
            
 # En HealthSyncRegistroFisiologicoAPI - Modificar/agregar este método
def actualizar_csv_servidor(self, user, nuevo_registro):
    """
    Actualiza el archivo CSV existente añadiendo el nuevo registro.
    Si no existe el CSV, lo crea.
    """
    try:
        import csv
        import os
        from datetime import datetime
        
        # 1. Directorio y nombre del archivo
        csv_dir = os.path.join('media', 'csv_healthsync')
        os.makedirs(csv_dir, exist_ok=True)
        
        username_clean = user.username.replace(' ', '_').lower()
        csv_filename = f"health_data_{username_clean}.csv"
        csv_path = os.path.join(csv_dir, csv_filename)
        
        # 2. Preparar datos del nuevo registro para CSV
        nuevo_registro_csv = {
            'id': nuevo_registro.id,
            'fecha': nuevo_registro.fecha.strftime('%Y-%m-%d %H:%M:%S'),
            'usuario': user.username,
            'pasos_diarios': nuevo_registro.pasos_diarios,
            'frecuencia_cardiaca': nuevo_registro.frecuencia_cardiaca,
            'calorias_quemadas': nuevo_registro.calorias_quemadas,
            'presion_sistolica': nuevo_registro.presion_arterial_sistolica,
            'presion_diastolica': nuevo_registro.presion_arterial_diastolica,
            'temperatura': nuevo_registro.temperatura,
            'oxigenacion_sangre': nuevo_registro.oxigenacion_sangre,
            'horas_sueno': nuevo_registro.horas_sueno,
            'puntuacion_sueno': nuevo_registro.puntuacion_sueno,
            'estres_relajado': nuevo_registro.estres_relajado,
            'estres_bajo': nuevo_registro.estres_bajo,
            'estres_moderado': nuevo_registro.estres_moderado,
            'estres_alto': nuevo_registro.estres_alto,
            'nivel_estres_calculado': nuevo_registro.nivel_estres,
            'notas_adicionales': nuevo_registro.notas_adicionales or '',
            'dispositivo_origen': nuevo_registro.dispositivo_origen or 'Android'
        }
        
        # 3. Verificar si el archivo CSV existe
        archivo_existe = os.path.exists(csv_path)
        
        # 4. Escribir/actualizar CSV
        with open(csv_path, 'a' if archivo_existe else 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'id', 'fecha', 'usuario',
                'pasos_diarios', 'frecuencia_cardiaca', 'calorias_quemadas',
                'presion_sistolica', 'presion_diastolica', 'temperatura',
                'oxigenacion_sangre', 'horas_sueno', 'puntuacion_sueno',
                'estres_relajado', 'estres_bajo', 'estres_moderado', 'estres_alto',
                'nivel_estres_calculado',
                'notas_adicionales', 'dispositivo_origen'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Si es nuevo archivo, escribir encabezados
            if not archivo_existe:
                writer.writeheader()
                print(f"✅ CSV creado: {csv_path}")
            
            # Escribir el nuevo registro
            writer.writerow(nuevo_registro_csv)
        
        # 5. Log de éxito
        if archivo_existe:
            print(f"📝 CSV actualizado: Añadido registro ID {nuevo_registro.id}")
        else:
            print(f"📄 CSV creado: Primer registro ID {nuevo_registro.id}")
        
        # 6. Opcional: Contar líneas en el CSV
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                line_count = sum(1 for line in f)
            print(f"   Total registros en CSV: {line_count - 1}")  # -1 por el header
        except:
            pass
        
        return True
        
    except Exception as e:
        print(f"❌ Error actualizando CSV: {e}")
        import traceback
        traceback.print_exc()
        return False
        
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