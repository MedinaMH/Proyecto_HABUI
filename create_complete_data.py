import os
import sys
import random
from datetime import timedelta, datetime

# Configurar Django
sys.path.append('C:/Users/chave/Documents/GitHub/Proyecto_HABUI')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'HABUI_APP.settings')

import django
django.setup()

from PWMS.models import (
    Mission, 
    ZungAnxietyScale, 
    EvaluacionNASATLX, 
    RegistroFisiologico,
    PerfilPWMS
)
from django.contrib.auth.models import User
from django.utils import timezone

# Lista de usuarios que tienes
USUARIOS = [
    'isa_cisl', 'ana_cisl', 'mis_medh', 'jav_marr',
    'comandante', 'cientifico', 'ingeniero', 'medico', 'piloto'
]

def crear_perfiles():
    """Crear perfiles para todos los usuarios"""
    print("\n📋 CREANDO PERFILES...")
    contador = 0
    roles = {
        'comandante': 'Comandante',
        'cientifico': 'Científico',
        'ingeniero': 'Ingeniero',
        'medico': 'Médico',
        'piloto': 'Piloto',
        'isa_cisl': 'Científico',
        'ana_cisl': 'Médico',
        'mis_medh': 'Ingeniero',
        'jav_marr': 'Piloto'
    }
    
    for username in USUARIOS:
        try:
            user = User.objects.get(username=username)
            perfil, created = PerfilPWMS.objects.get_or_create(
                usuario=user,
                defaults={
                    'pin': '1234',
                    'telefono': f'555{random.randint(100000, 999999)}',
                    'fecha_nacimiento': datetime(random.randint(1980, 2000), random.randint(1, 12), random.randint(1, 28)).date(),
                    'genero': random.choice(['masculino', 'femenino', 'otro']),
                    'role': roles.get(username, 'Tripulante'),
                    'experience': random.choice(['Novato', 'Intermedio', 'Experto']),
                    'baseline_stress': random.randint(3, 7),
                    'baseline_fatigue': random.randint(3, 7),
                    'baseline_cognitive': random.randint(3, 7)
                }
            )
            if created:
                contador += 1
                print(f"  ✅ Perfil creado para: {username}")
        except User.DoesNotExist:
            print(f"  ⚠️ Usuario no existe: {username}")
    
    print(f"  📊 Total perfiles creados: {contador}")
    return contador

def crear_mision():
    """Crear misión con todos los tripulantes"""
    print("\n🚀 CREANDO MISIÓN...")
    
    mission = Mission.objects.first()
    if mission:
        print(f"  📋 Usando misión existente: {mission.name}")
        return mission
    
    # Crear nueva misión
    users = []
    for username in USUARIOS:
        try:
            user = User.objects.get(username=username)
            users.append(user)
        except User.DoesNotExist:
            pass
    
    mission = Mission.objects.create(
        name="Misión Análoga Marte 2026",
        habitat_type="Hábitat Marciano",
        duration_days=14,
        start_date=datetime.now().date() - timedelta(days=7),
        description="Misión de simulación para estudio de factores humanos",
        phases=[
            {"name": "Adaptación", "day_start": 1, "day_end": 3},
            {"name": "Operación Normal", "day_start": 4, "day_end": 10},
            {"name": "Emergencia", "day_start": 11, "day_end": 12},
            {"name": "Cierre", "day_start": 13, "day_end": 14}
        ]
    )
    mission.crew_members.set(users)
    print(f"  ✅ Misión creada: {mission.name}")
    print(f"  📅 Duración: {mission.duration_days} días")
    print(f"  👥 Tripulantes: {len(users)}")
    return mission

def crear_datos_ansiedad(mission):
    """Crear datos de ansiedad (Zung) para todos los días"""
    print("\n😰 CREANDO DATOS DE ANSIEDAD...")
    contador = 0
    
    for crew in mission.crew_members.all():
        print(f"  👨‍🚀 {crew.username}")
        for day in range(mission.duration_days):
            current_date = mission.start_date + timedelta(days=day)
            
            # Valor de ansiedad (35-85)
            anxiety_index = random.randint(40, 80)
            
            if anxiety_index < 50:
                nivel = 'normal'
            elif anxiety_index < 60:
                nivel = 'minima'
            elif anxiety_index < 75:
                nivel = 'marcada'
            else:
                nivel = 'extrema'
            
            # Verificar si ya existe
            if not ZungAnxietyScale.objects.filter(
                usuario=crew, fecha_registro__date=current_date
            ).exists():
                # Respuestas aleatorias (1-4)
                respuestas = [random.randint(1, 4) for _ in range(20)]
                
                ZungAnxietyScale.objects.create(
                    usuario=crew,
                    fecha_registro=current_date,
                    puntuacion_bruta=int(anxiety_index * 0.85),
                    puntuacion_indice=anxiety_index,
                    nivel_ansiedad=nivel,
                    p01_me_siento_mas_nervioso=respuestas[0],
                    p02_siento_miedo_sin_razon=respuestas[1],
                    p03_me_siento_alterado=respuestas[2],
                    p04_siento_que_me_desmorono=respuestas[3],
                    p05_siento_que_todo_bien=respuestas[4],
                    p06_temblor_sacudidas=respuestas[5],
                    p07_dolores_cabeza_cuello=respuestas[6],
                    p08_debilidad_fatiga=respuestas[7],
                    p09_siento_calma_tranquilidad=respuestas[8],
                    p10_siento_latidos_corazon=respuestas[9],
                    p11_mareos=respuestas[10],
                    p12_desmayos=respuestas[11],
                    p13_respiracion_normal=respuestas[12],
                    p14_entumecimiento_hormigueo=respuestas[13],
                    p15_dolores_estomacales=respuestas[14],
                    p16_necesidad_orinar=respuestas[15],
                    p17_manos_calidas_secas=respuestas[16],
                    p18_sonrojo_bochorno=respuestas[17],
                    p19_duermo_bien_descanso=respuestas[18],
                    p20_pesadillas=respuestas[19],
                )
                contador += 1
        print(f"    ✅ {contador} registros de ansiedad")
    
    print(f"  📊 Total ansiedad creados: {contador}")
    return contador

def crear_datos_estres(mission):
    """Crear datos fisiológicos (estrés, FC, etc.)"""
    print("\n💓 CREANDO DATOS FISIOLÓGICOS...")
    contador = 0
    
    for crew in mission.crew_members.all():
        print(f"  👨‍🚀 {crew.username}")
        for day in range(mission.duration_days):
            current_date = mission.start_date + timedelta(days=day)
            # Hora aleatoria entre 8 AM y 8 PM
            random_hour = random.randint(8, 20)
            current_datetime = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=random_hour)
            
            if not RegistroFisiologico.objects.filter(
                usuario=crew, fecha__date=current_date
            ).exists():
                # Frecuencia cardíaca (60-120)
                frecuencia = random.randint(65, 115)
                
                # Nivel de estrés basado en frecuencia cardíaca
                if frecuencia < 75:
                    estres = random.randint(1, 3)
                elif frecuencia < 95:
                    estres = random.randint(4, 6)
                else:
                    estres = random.randint(7, 10)
                
                RegistroFisiologico.objects.create(
                    usuario=crew,
                    fecha=current_datetime,
                    frecuencia_cardiaca=frecuencia,
                    presion_arterial_sistolica=random.randint(105, 135),
                    presion_arterial_diastolica=random.randint(65, 85),
                    temperatura=round(random.uniform(36.0, 37.5), 1),
                    oxigenacion_sangre=random.randint(94, 99),
                    pasos_diarios=random.randint(5000, 15000),
                    horas_sueno=round(random.uniform(6, 9), 1),
                    nivel_estres=estres
                )
                contador += 1
        print(f"    ✅ {contador} registros fisiológicos")
    
    print(f"  📊 Total fisiológicos creados: {contador}")
    return contador

def crear_datos_carga_trabajo(mission):
    """Crear datos NASA-TLX (carga de trabajo)"""
    print("\n⚙️ CREANDO DATOS NASA-TLX...")
    contador = 0
    
    for crew in mission.crew_members.all():
        print(f"  👨‍🚀 {crew.username}")
        for day in range(mission.duration_days):
            current_date = mission.start_date + timedelta(days=day)
            
            if not EvaluacionNASATLX.objects.filter(
                usuario=crew, fecha_creacion__date=current_date
            ).exists():
                # Puntuaciones para cada dimensión (0-20)
                demanda_mental = random.randint(5, 18)
                demanda_fisica = random.randint(3, 16)
                demanda_temporal = random.randint(4, 17)
                rendimiento = random.randint(3, 18)
                esfuerzo = random.randint(5, 19)
                frustracion = random.randint(2, 15)
                
                # Puntuación total (0-100)
                total = int((demanda_mental + demanda_fisica + demanda_temporal + 
                           rendimiento + esfuerzo + frustracion) / 1.2)
                
                EvaluacionNASATLX.objects.create(
                    usuario=crew,
                    fecha_creacion=current_date,
                    demanda_mental=demanda_mental,
                    demanda_fisica=demanda_fisica,
                    demanda_temporal=demanda_temporal,
                    rendimiento=rendimiento,
                    esfuerzo=esfuerzo,
                    frustracion=frustracion,
                    puntuacion_total=total
                )
                contador += 1
        print(f"    ✅ {contador} registros NASA-TLX")
    
    print(f"  📊 Total NASA-TLX creados: {contador}")
    return contador

def resumen_final():
    """Mostrar resumen de todos los datos"""
    print("\n" + "="*50)
    print("📊 RESUMEN FINAL")
    print("="*50)
    print(f"  🚀 Misiones: {Mission.objects.count()}")
    print(f"  👥 Usuarios con perfil: {PerfilPWMS.objects.count()}")
    print(f"  😰 Ansiedad (Zung): {ZungAnxietyScale.objects.count()}")
    print(f"  💓 Fisiológicos: {RegistroFisiologico.objects.count()}")
    print(f"  ⚙️ NASA-TLX: {EvaluacionNASATLX.objects.count()}")
    print("="*50)

if __name__ == '__main__':
    print("="*50)
    print("🎯 SCRIPT DE CREACIÓN DE DATOS COMPLETOS")
    print("="*50)
    
    crear_perfiles()
    mission = crear_mision()
    crear_datos_ansiedad(mission)
    crear_datos_estres(mission)
    crear_datos_carga_trabajo(mission)
    resumen_final()
    
    print("\n✅ ¡LISTO! Los datos están creados.")
    print("👉 Ahora ve al heatmap: http://127.0.0.1:8000/pwms/mission/1/heatmap/")