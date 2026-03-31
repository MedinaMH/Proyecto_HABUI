from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico
from django.utils import timezone

# ===== SERIALIZADORES DE USUARIO =====

class UserSerializer(serializers.ModelSerializer):
    """Serializer básico de usuario - ACTUALMENTE NO USADO"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class LoginSerializer(serializers.Serializer):
    """Serializer para login con usuario y PIN - EN USO"""
    username = serializers.CharField(max_length=150, required=True)
    pin = serializers.CharField(max_length=4, min_length=4, required=True)
    
    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("El PIN debe contener solo números")
        if len(value) != 4:
            raise serializers.ValidationError("El PIN debe tener exactamente 4 dígitos")
        return value

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer para registro - ACTUALMENTE NO USADO (se usa HealthSyncRegisterAPI)"""
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    pin = serializers.CharField(max_length=4, min_length=4, write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'pin']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})
        
        if not attrs['pin'].isdigit():
            raise serializers.ValidationError({"pin": "El PIN debe contener solo números"})
        
        if len(attrs['pin']) != 4:
            raise serializers.ValidationError({"pin": "El PIN debe tener exactamente 4 dígitos"})
        
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        perfil = user.perfil_pwms
        perfil.pin = validated_data['pin']
        perfil.save()
        
        return user

# ===== SERIALIZADORES DE PERFIL =====

class PerfilSerializer(serializers.ModelSerializer):
    """Serializer para el perfil PWMS - EN USO"""
    usuario = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = PerfilPWMS
        fields = [
            'usuario', 'fecha_nacimiento', 'genero', 'telefono', 
            'grupo_sanguineo', 'alergias', 'medicamentos', 
            'condiciones_medicas', 'psicologo_asignado', 'motivo_consulta',
            'compartir_datos_medicos', 'recibir_recordatorios',
            'creado_en', 'actualizado_en'
        ]
        read_only_fields = ['creado_en', 'actualizado_en']
    
    def validate_telefono(self, value):
        if value and not value.replace('+', '').replace(' ', '').isdigit():
            raise serializers.ValidationError("El teléfono debe contener solo números")
        return value
    
    def validate_grupo_sanguineo(self, value):
        if value and value.upper() not in ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']:
            raise serializers.ValidationError("Grupo sanguíneo no válido")
        return value.upper() if value else value

# ===== SERIALIZADORES DE REGISTROS =====

class RegistroPsicologicoSerializer(serializers.ModelSerializer):
    """Serializer para registros psicológicos - EN USO"""
    usuario = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = RegistroPsicologico
        fields = [
            'id', 'usuario', 'fecha', 'nivel_estres', 'nivel_ansiedad',
            'estado_animo', 'notas_dia', 'eventos_significativos',
            'pensamientos_recurrentes', 'creado_por'
        ]
        read_only_fields = ['id', 'usuario', 'fecha', 'creado_por']
    
    def validate_nivel_estres(self, value):
        if not 1 <= value <= 10:
            raise serializers.ValidationError("El nivel de estrés debe estar entre 1 y 10")
        return value
    
    def validate_nivel_ansiedad(self, value):
        if not 1 <= value <= 10:
            raise serializers.ValidationError("El nivel de ansiedad debe estar entre 1 y 10")
        return value
    
    def validate_estado_animo(self, value):
        if not 1 <= value <= 10:
            raise serializers.ValidationError("El estado de ánimo debe estar entre 1 y 10")
        return value


class RegistroFisiologicoSerializer(serializers.ModelSerializer):
    """
    Serializer para registros fisiológicos - EN USO
    Maneja campos de Android y los convierte al formato de Django
    """
    usuario = serializers.StringRelatedField(read_only=True)
    fechaHora = serializers.DateTimeField(write_only=True, required=False)
    
    # Campos para estrés (mapeo desde Android)
    stress_relaxed = serializers.IntegerField(
        source='estres_relajado',
        required=False,
        min_value=0,
        max_value=100,
        default=0
    )
    stress_low = serializers.IntegerField(
        source='estres_bajo',
        required=False,
        min_value=0,
        max_value=100,
        default=0
    )
    stress_moderate = serializers.IntegerField(
        source='estres_moderado',
        required=False,
        min_value=0,
        max_value=100,
        default=0
    )
    stress_high = serializers.IntegerField(
        source='estres_alto',
        required=False,
        min_value=0,
        max_value=100,
        default=0
    )
    
    # Campos para sueño (procesamiento)
    horas_sueno_horas = serializers.IntegerField(
        write_only=True,
        required=False,
        min_value=0,
        max_value=24,
        default=0
    )
    horas_sueno_minutos = serializers.IntegerField(
        write_only=True,
        required=False,
        min_value=0,
        max_value=59,
        default=0
    )
    
    class Meta:
        model = RegistroFisiologico
        fields = [
            'id', 'usuario', 'fecha', 'fechaHora', 
            'frecuencia_cardiaca', 'presion_arterial_sistolica', 
            'presion_arterial_diastolica', 'temperatura', 
            'oxigenacion_sangre', 'pasos_diarios', 'calorias_quemadas',
            'horas_sueno', 'horas_sueno_horas', 'horas_sueno_minutos',
            'puntuacion_sueno', 'nivel_estres',
            'estres_relajado', 'estres_bajo', 'estres_moderado', 'estres_alto',
            'stress_relaxed', 'stress_low', 'stress_moderate', 'stress_high',
            'dispositivo_origen', 'notas_adicionales'
        ]
        read_only_fields = ['id', 'usuario', 'nivel_estres']
        extra_kwargs = {
            'fecha': {'required': False},
            'frecuencia_cardiaca': {'required': False, 'default': 0},
            'presion_arterial_sistolica': {'required': False, 'default': 0},
            'presion_arterial_diastolica': {'required': False, 'default': 0},
            'temperatura': {'required': False, 'default': 0},
            'oxigenacion_sangre': {'required': False, 'default': 0},
            'pasos_diarios': {'required': False, 'default': 0},
            'calorias_quemadas': {'required': False, 'default': 0},
            'estres_relajado': {'required': False, 'default': 0},
            'estres_bajo': {'required': False, 'default': 0},
            'estres_moderado': {'required': False, 'default': 0},
            'estres_alto': {'required': False, 'default': 0},
        }
    
    def validate(self, data):
        """
        Validación personalizada de todos los campos
        """
        print("\n🔍 SERIALIZER: validate")
        
        # ===== 1. PROCESAR HORAS DE SUEÑO =====
        horas = data.pop('horas_sueno_horas', None)
        minutos = data.pop('horas_sueno_minutos', None)
        
        if horas is not None and minutos is not None:
            data['horas_sueno'] = horas + (minutos / 60.0)
            print(f"   ⏰ Sueño calculado: {horas}h {minutos}m = {data['horas_sueno']}h")
        elif horas is not None:
            data['horas_sueno'] = horas
        elif minutos is not None:
            data['horas_sueno'] = minutos / 60.0
        
        # ===== 2. PROCESAR PORCENTAJES DE ESTRÉS =====
        # Mapear stress_* a estres_*
        mapeo_stress = {
            'stress_relaxed': 'estres_relajado',
            'stress_low': 'estres_bajo',
            'stress_moderate': 'estres_moderado',
            'stress_high': 'estres_alto'
        }
        
        for android_field, django_field in mapeo_stress.items():
            if android_field in data:
                data[django_field] = data.pop(android_field)
        
        # Obtener valores
        estres_relajado = data.get('estres_relajado', 0)
        estres_bajo = data.get('estres_bajo', 0)
        estres_moderado = data.get('estres_moderado', 0)
        estres_alto = data.get('estres_alto', 0)
        
        # Calcular total
        total = estres_relajado + estres_bajo + estres_moderado + estres_alto
        
        # Normalizar si es necesario
        if total > 0 and total != 100:
            print(f"   ⚠️ Porcentajes de estrés suman {total}%, normalizando...")
            factor = 100 / total
            data['estres_relajado'] = round(estres_relajado * factor)
            data['estres_bajo'] = round(estres_bajo * factor)
            data['estres_moderado'] = round(estres_moderado * factor)
            data['estres_alto'] = round(estres_alto * factor)
            
            # Ajustar por errores de redondeo
            nuevo_total = (data['estres_relajado'] + data['estres_bajo'] + 
                          data['estres_moderado'] + data['estres_alto'])
            
            if nuevo_total != 100:
                diff = 100 - nuevo_total
                campos = ['estres_alto', 'estres_moderado', 'estres_bajo', 'estres_relajado']
                for campo in campos:
                    if diff != 0:
                        data[campo] = data[campo] + diff
                        diff = 0
                        break
            
            print(f"   ✅ Porcentajes normalizados: {data['estres_relajado']}/{data['estres_bajo']}/{data['estres_moderado']}/{data['estres_alto']}")
        
        # ===== 3. VALIDAR RANGOS DE SIGNOS VITALES =====
        if data.get('frecuencia_cardiaca', 0) < 30 or data.get('frecuencia_cardiaca', 0) > 250:
            raise serializers.ValidationError({
                "frecuencia_cardiaca": "Debe estar entre 30 y 250 latidos por minuto"
            })
        
        if data.get('presion_arterial_sistolica', 0) < 50 or data.get('presion_arterial_sistolica', 0) > 250:
            raise serializers.ValidationError({
                "presion_arterial_sistolica": "Debe estar entre 50 y 250 mmHg"
            })
        
        if data.get('presion_arterial_diastolica', 0) < 30 or data.get('presion_arterial_diastolica', 0) > 150:
            raise serializers.ValidationError({
                "presion_arterial_diastolica": "Debe estar entre 30 y 150 mmHg"
            })
        
        if data.get('temperatura', 0) < 35 or data.get('temperatura', 0) > 42:
            raise serializers.ValidationError({
                "temperatura": "Debe estar entre 35 y 42 °C"
            })
        
        if data.get('oxigenacion_sangre', 0) < 70 or data.get('oxigenacion_sangre', 0) > 100:
            raise serializers.ValidationError({
                "oxigenacion_sangre": "Debe estar entre 70 y 100%"
            })
        
        if 'puntuacion_sueno' in data and data['puntuacion_sueno'] is not None:
            if data['puntuacion_sueno'] < 0 or data['puntuacion_sueno'] > 100:
                raise serializers.ValidationError({
                    "puntuacion_sueno": "Debe estar entre 0 y 100"
                })
        
        print("   ✅ Validaciones pasadas exitosamente")
        return data
    
    def create(self, validated_data):
        """Crear un nuevo registro fisiológico"""
        print("\n💾 SERIALIZER: create")
        print("   Datos validados recibidos:", list(validated_data.keys()))
        
        # Eliminar campo temporal si existe
        validated_data.pop('fechaHora', None)
        
        # Verificar que fecha esté presente
        if 'fecha' not in validated_data or validated_data['fecha'] is None:
            validated_data['fecha'] = timezone.now()
            print("   ⚠️ fecha era None, usando timezone.now()")
        
        print("   Datos finales para crear:", list(validated_data.keys()))
        
        # Crear el registro
        registro = super().create(validated_data)
        print(f"   ✅ Registro creado con ID: {registro.id}")
        print(f"   📅 Fecha guardada: {registro.fecha}")
        
        return registro
    
    def update(self, instance, validated_data):
        """Actualizar un registro existente"""
        print("\n🔄 SERIALIZER: update")
        print("   Actualizando registro ID:", instance.id)
        
        validated_data.pop('fechaHora', None)
        
        return super().update(instance, validated_data)