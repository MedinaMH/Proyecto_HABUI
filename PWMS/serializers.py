from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico

# ===== SERIALIZERS DE USUARIO =====

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class LoginSerializer(serializers.Serializer):
    """
    Serializer para login con usuario y PIN
    """
    username = serializers.CharField(max_length=150, required=True)
    pin = serializers.CharField(max_length=4, min_length=4, required=True)
    
    def validate_pin(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("El PIN debe contener solo números")
        if len(value) != 4:
            raise serializers.ValidationError("El PIN debe tener exactamente 4 dígitos")
        return value

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de usuario
    """
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
        
        # Guardar PIN en el perfil
        perfil = user.perfil_pwms
        perfil.pin = validated_data['pin']
        perfil.save()
        
        return user

# ===== SERIALIZERS DE PERFIL =====

class PerfilSerializer(serializers.ModelSerializer):
    """
    Serializer para el perfil PWMS
    """
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

# ===== SERIALIZERS DE REGISTROS =====

class RegistroPsicologicoSerializer(serializers.ModelSerializer):
    """
    Serializer para registros psicológicos
    """
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
    usuario = serializers.StringRelatedField(read_only=True)
    
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
            'id', 'usuario', 'fecha', 'frecuencia_cardiaca',
            'presion_arterial_sistolica', 'presion_arterial_diastolica',
            'temperatura', 'oxigenacion_sangre', 'pasos_diarios',
            'calorias_quemadas', 'horas_sueno', 'horas_sueno_horas', 'horas_sueno_minutos',
            'dispositivo_origen', 'puntuacion_sueno', 'notas_adicionales',
            'stress_relaxed', 'stress_low', 'stress_moderate', 'stress_high'
        ]
        read_only_fields = ['id', 'usuario', 'fecha']
    
    def validate(self, data):
        # Validar que los 4 porcentajes sumen 100%
        estres_relajado = data.get('estres_relajado', 0)
        estres_bajo = data.get('estres_bajo', 0)
        estres_moderado = data.get('estres_moderado', 0)
        estres_alto = data.get('estres_alto', 0)
        
        total = estres_relajado + estres_bajo + estres_moderado + estres_alto
        
        if total > 0 and total != 100:
            raise serializers.ValidationError({
                "estres": f"Los porcentajes de estrés deben sumar 100% (actual: {total}%)"
            })
        
        # Validar y calcular horas de sueño
        horas = data.get('horas_sueno_horas')
        minutos = data.get('horas_sueno_minutos')
        
        if horas is not None and minutos is not None:
            # Calcular el valor decimal: 6h 25m = 6 + 25/60 = 6.4167
            data['horas_sueno'] = horas + (minutos / 60.0)
        
        # Eliminar los campos de horas y minutos para que no se pasen al modelo
        if 'horas_sueno_horas' in data:
            del data['horas_sueno_horas']
        if 'horas_sueno_minutos' in data:
            del data['horas_sueno_minutos']
        
        return data
    
    def validate_frecuencia_cardiaca(self, value):
        if value < 30 or value > 250:
            raise serializers.ValidationError("Frecuencia cardíaca fuera de rango válido (30-250)")
        return value
    
    def validate_presion_arterial_sistolica(self, value):
        if value < 50 or value > 250:
            raise serializers.ValidationError("Presión sistólica fuera de rango válido (50-250)")
        return value
    
    def validate_presion_arterial_diastolica(self, value):
        if value < 30 or value > 150:
            raise serializers.ValidationError("Presión diastólica fuera de rango válido (30-150)")
        return value
    
    def validate_temperatura(self, value):
        if value < 35 or value > 42:
            raise serializers.ValidationError("Temperatura fuera de rango válido (35-42 °C)")
        return value
    
    def validate_oxigenacion_sangre(self, value):
        if value < 70 or value > 100:
            raise serializers.ValidationError("Oxigenación fuera de rango válido (70-100%)")
        return value    
    
    def validate_puntuacion_sueno(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("La puntuación de sueño debe estar entre 0 y 100")
        return value