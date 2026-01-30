from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from .models import PerfilPWMS, RegistroPsicologico, RegistroFisiologico

class RegistroUsuarioForm(UserCreationForm):
    """
    Formulario para registro de nuevo usuario con PIN
    """
    email = forms.EmailField(required=True)
    pin = forms.CharField(
        max_length=4,
        min_length=4,
        widget=forms.PasswordInput(attrs={'placeholder': '4 dígitos'}),
        help_text="PIN de 4 dígitos para acceso rápido"
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'pin']
    
    def clean_pin(self):
        pin = self.cleaned_data.get('pin')
        if not pin.isdigit():
            raise forms.ValidationError("El PIN debe contener solo números")
        if len(pin) != 4:
            raise forms.ValidationError("El PIN debe tener exactamente 4 dígitos")
        return pin
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        
        if commit:
            user.save()
            # Guardar el PIN en el perfil
            perfil = user.perfil_pwms
            perfil.pin = self.cleaned_data['pin']
            perfil.save()
        
        return user

class LoginConPINForm(forms.Form):
    """
    Formulario de login con usuario y PIN
    """
    username = forms.CharField(max_length=150)
    pin = forms.CharField(
        max_length=4,
        min_length=4,
        widget=forms.PasswordInput(attrs={'placeholder': 'PIN de 4 dígitos'})
    )

class PerfilPWMSForm(forms.ModelForm):
    """
    Formulario para completar/actualizar perfil PWMS
    """
    class Meta:
        model = PerfilPWMS
        fields = [
            'fecha_nacimiento', 'genero', 'telefono', 
            'grupo_sanguineo', 'alergias', 'medicamentos',
            'condiciones_medicas', 'psicologo_asignado',
            'motivo_consulta', 'compartir_datos_medicos',
            'recibir_recordatorios'
        ]
        widgets = {
            'fecha_nacimiento': forms.DateInput(attrs={'type': 'date'}),
            'alergias': forms.Textarea(attrs={'rows': 3}),
            'medicamentos': forms.Textarea(attrs={'rows': 3}),
            'condiciones_medicas': forms.Textarea(attrs={'rows': 3}),
            'motivo_consulta': forms.Textarea(attrs={'rows': 4}),
        }

class RegistroPsicologicoForm(forms.ModelForm):
    """
    Formulario para registro psicológico diario
    """
    class Meta:
        model = RegistroPsicologico
        fields = [
            'nivel_estres', 'nivel_ansiedad', 'estado_animo',
            'notas_dia', 'eventos_significativos', 'pensamientos_recurrentes'
        ]
        widgets = {
            'notas_dia': forms.Textarea(attrs={'rows': 4, 'placeholder': '¿Cómo te sientes hoy?'}),
            'eventos_significativos': forms.Textarea(attrs={'rows': 3}),
            'pensamientos_recurrentes': forms.Textarea(attrs={'rows': 3}),
        }

class RegistroFisiologicoForm(forms.ModelForm):
    """
    Formulario para registro fisiológico
    """
    class Meta:
        model = RegistroFisiologico
        fields = [
            'frecuencia_cardiaca', 'presion_arterial_sistolica',
            'presion_arterial_diastolica', 'temperatura', 'oxigenacion_sangre',
            'pasos_diarios', 'calorias_quemadas', 'horas_sueno',
            'dispositivo_origen'
        ]