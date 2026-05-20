# utils/xml_generator.py
"""
Utilidades para generar XML de AnalogCrewStudy desde modelos PWMS
"""
from django.utils import timezone
from django.db.models import Avg, Count
from datetime import datetime, timedelta
import json
from typing import Dict, List, Any
from xml.sax.saxutils import escape, quoteattr

def generate_analog_crew_study_xml(mission_id: int) -> str:
    """
    Genera XML completo para AnalogCrewStudy desde los modelos PWMS
    
    Args:
        mission_id: ID de la misión
    
    Returns:
        String con formato XML
    """
    
    from core.models import Mission, User, RegistroPsicologico, RegistroFisiologico, EvaluacionNASATLX, ZungAnxietyScale
    
    try:
        mission = Mission.objects.get(id=mission_id)
    except Mission.DoesNotExist:
        return f"<error>Misión con ID {mission_id} no encontrada</error>"
    
    xml_lines = []
    xml_lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    xml_lines.append('<AnalogCrewStudy>')
    
    # ========== 1. SECCIÓN MISSION ==========
    xml_lines.append('  <Mission>')
    xml_lines.append(f'    <MissionName>{escape(mission.name)}</MissionName>')
    xml_lines.append(f'    <HabitatType>{escape(mission.habitat_type)}</HabitatType>')
    xml_lines.append(f'    <Duration>{mission.duration_days}</Duration>')
    
    # Fases de la misión (desde JSONField)
    if mission.phases:
        for phase in mission.phases:
            xml_lines.append('    <Phase>')
            xml_lines.append(f'      <PhaseName>{escape(phase.get("name", "Unknown"))}</PhaseName>')
            xml_lines.append(f'      <DayStart>{phase.get("day_start", 0)}</DayStart>')
            xml_lines.append(f'      <DayEnd>{phase.get("day_end", 0)}</DayEnd>')
            xml_lines.append('    </Phase>')
    
    xml_lines.append('  </Mission>')
    
    # ========== 2. SECCIÓN CREW MEMBERS ==========
    # Mapear usuarios (tripulantes) de la misión
    for crew_user in mission.crew_members.all():
        try:
            perfil = crew_user.perfil_pwms
        except:
            # Si no tiene perfil, usar valores por defecto
            perfil = None
        
        role = perfil.role if perfil and perfil.role else 'Scientist'
        experience = perfil.experience if perfil and perfil.experience else 'Experienced'
        
        xml_lines.append(f'  <CrewMember role="{escape(role)}">')
        xml_lines.append(f'    <CrewID>{escape(crew_user.username)}</CrewID>')
        
        # Demographics
        xml_lines.append('    <Demographics>')
        if perfil and perfil.fecha_nacimiento:
            age = timezone.now().year - perfil.fecha_nacimiento.year
            xml_lines.append(f'      <Age>{age}</Age>')
        else:
            xml_lines.append('      <Age>30</Age>')
        
        gender_map = {'masculino': 'Male', 'femenino': 'Female', 'otro': 'Other', 'prefiero_no_decirlo': 'Other'}
        gender = gender_map.get(perfil.genero if perfil else '', 'Other')
        xml_lines.append(f'      <Gender>{gender}</Gender>')
        xml_lines.append(f'      <ExperienceLevel>{experience}</ExperienceLevel>')
        xml_lines.append('    </Demographics>')
        
        # Baseline Measures (desde PerfilPWMS)
        xml_lines.append('    <BaselineMeasures>')
        baseline_stress = perfil.baseline_stress if perfil and perfil.baseline_stress else 0
        baseline_fatigue = perfil.baseline_fatigue if perfil and perfil.baseline_fatigue else 0
        baseline_cognitive = perfil.baseline_cognitive if perfil and perfil.baseline_cognitive else 0
        
        xml_lines.append(f'      <BaselineStress>{baseline_stress}</BaselineStress>')
        xml_lines.append(f'      <BaselineFatigue>{baseline_fatigue}</BaselineFatigue>')
        xml_lines.append(f'      <BaselineCognitive>{baseline_cognitive}</BaselineCognitive>')
        xml_lines.append('    </BaselineMeasures>')
        
        # Psychological Profile (opcional)
        xml_lines.append('    <PsychologicalProfile type="Individualized">')
        xml_lines.append(f'      <ProfileID>PROF-{crew_user.username}</ProfileID>')
        xml_lines.append('      <TimeSegment>Full mission</TimeSegment>')
        
        # Calcular perfil psicológico desde registros
        registros_psi = RegistroPsicologico.objects.filter(usuario=crew_user)
        if registros_psi.exists():
            avg_stress = registros_psi.aggregate(Avg('nivel_estres'))['nivel_estres__avg'] or 0
            avg_anxiety = registros_psi.aggregate(Avg('nivel_ansiedad'))['nivel_ansiedad__avg'] or 0
            profile_data = {
                "avg_stress": round(avg_stress, 1),
                "avg_anxiety": round(avg_anxiety, 1),
                "total_assessments": registros_psi.count(),
                "pattern": "analizado desde PWMS"
            }
        else:
            profile_data = {"pattern": "under development"}
        
        xml_lines.append(f'      <ProfileData>{escape(json.dumps(profile_data))}</ProfileData>')
        xml_lines.append('    </PsychologicalProfile>')
        xml_lines.append('  </CrewMember>')
    
    # ========== 3. SECCIÓN ASSESSMENTS ==========
    # Generar evaluaciones combinando datos de diferentes modelos
    
    # Obtener todas las fechas relevantes
    all_dates = set()
    
    # Fechas de Registros Psicológicos
    for registro in RegistroPsicologico.objects.filter(usuario__in=mission.crew_members.all()):
        all_dates.add(registro.fecha.date())
    
    # Fechas de Registros Fisiológicos
    for registro_fisio in RegistroFisiologico.objects.filter(usuario__in=mission.crew_members.all()):
        all_dates.add(registro_fisio.fecha.date())
    
    # Fechas de Evaluaciones NASA TLX
    for eval_nasa in EvaluacionNASATLX.objects.filter(usuario__in=mission.crew_members.all()):
        all_dates.add(eval_nasa.fecha_creacion.date())
    
    # Fechas de Zung Anxiety
    for eval_zung in ZungAnxietyScale.objects.filter(usuario__in=mission.crew_members.all()):
        all_dates.add(eval_zung.fecha_registro.date())
    
    # Convertir a lista ordenada
    sorted_dates = sorted(list(all_dates))
    
    # Para cada tripulante y cada fecha, crear assessment
    assessment_counter = 1
    
    for crew_user in mission.crew_members.all():
        for date in sorted_dates:
            # Calcular día de misión
            mission_day = (date - mission.start_date).days + 1
            
            if mission_day <= 0 or mission_day > mission.duration_days:
                continue
            
            # Obtener datos de cada fuente
            registro_psi = RegistroPsicologico.objects.filter(
                usuario=crew_user,
                fecha__date=date
            ).first()
            
            registro_fisio = RegistroFisiologico.objects.filter(
                usuario=crew_user,
                fecha__date=date
            ).first()
            
            eval_nasa = EvaluacionNASATLX.objects.filter(
                usuario=crew_user,
                fecha_creacion__date=date
            ).first()
            
            eval_zung = ZungAnxietyScale.objects.filter(
                usuario=crew_user,
                fecha_registro__date=date
            ).first()
            
            # Solo crear assessment si hay algún dato
            if not any([registro_psi, registro_fisio, eval_nasa, eval_zung]):
                continue
            
            xml_lines.append(f'  <Assessment type="Daily" timestamp="{date.isoformat()}T12:00:00">')
            xml_lines.append(f'    <AssessmentID>ASSESS-{assessment_counter:04d}</AssessmentID>')
            xml_lines.append(f'    <CrewIDRef>{escape(crew_user.username)}</CrewIDRef>')
            xml_lines.append(f'    <MissionDay>{mission_day}</MissionDay>')
            
            # ---------------- Psychological State ----------------
            xml_lines.append('    <PsychologicalState>')
            
            if registro_psi:
                # Mapear nivel_estres (1-10) a escala 0-10
                stress_value = registro_psi.nivel_estres / 10 if registro_psi.nivel_estres else None
                anxiety_value = registro_psi.nivel_ansiedad / 10 if registro_psi.nivel_ansiedad else None
                fatigue_value = registro_psi.fatiga / 10 if hasattr(registro_psi, 'fatiga') and registro_psi.fatiga else None
                
                xml_lines.append(f'      <MentalStress>{stress_value if stress_value else ""}</MentalStress>')
                xml_lines.append(f'      <MentalStrain>{stress_value if stress_value else ""}</MentalStrain>')
                xml_lines.append(f'      <PositiveAffect>{registro_psi.estado_animo / 10 if registro_psi.estado_animo else ""}</PositiveAffect>')
                xml_lines.append(f'      <NegativeAffect>{7 - (registro_psi.estado_animo / 10) if registro_psi.estado_animo else ""}</NegativeAffect>')
                xml_lines.append(f'      <FatigueLevel>{fatigue_value if fatigue_value else ""}</FatigueLevel>')
                xml_lines.append(f'      <Anxiety>{anxiety_value if anxiety_value else ""}</Anxiety>')
            else:
                xml_lines.append('      <MentalStress/>')
                xml_lines.append('      <MentalStrain/>')
                xml_lines.append('      <PositiveAffect/>')
                xml_lines.append('      <NegativeAffect/>')
                xml_lines.append('      <FatigueLevel/>')
                xml_lines.append('      <Anxiety/>')
            
            xml_lines.append('    </PsychologicalState>')
            
            # ---------------- Workload Metrics ----------------
            xml_lines.append('    <WorkloadMetrics>')
            
            if eval_nasa:
                # Convertir NASA TLX (0-20) a escala 0-10
                mental_workload = eval_nasa.demanda_mental / 2
                physical_workload = eval_nasa.demanda_fisica / 2
                task_difficulty = eval_nasa.demanda_temporal / 2
                cognitive_performance = eval_nasa.puntuacion_total  # Ya está en 0-100
                
                xml_lines.append(f'      <MentalWorkload>{mental_workload}</MentalWorkload>')
                xml_lines.append(f'      <PhysicalWorkload>{physical_workload}</PhysicalWorkload>')
                xml_lines.append(f'      <TaskDifficulty>{task_difficulty}</TaskDifficulty>')
                xml_lines.append(f'      <CognitivePerformance>{cognitive_performance}</CognitivePerformance>')
            else:
                xml_lines.append('      <MentalWorkload/>')
                xml_lines.append('      <PhysicalWorkload/>')
                xml_lines.append('      <TaskDifficulty/>')
                xml_lines.append('      <CognitivePerformance/>')
            
            xml_lines.append('    </WorkloadMetrics>')
            
            # ---------------- Social Factors (opcional) ----------------
            xml_lines.append('    <SocialFactors>')
            xml_lines.append('      <SocialSupport/>')
            xml_lines.append('      <TeamCohesion/>')
            xml_lines.append('      <Conflict/>')
            xml_lines.append('      <IsolationPerception/>')
            xml_lines.append('    </SocialFactors>')
            
            # ---------------- Habitat Perception (opcional) ----------------
            xml_lines.append('    <HabitatPerception>')
            xml_lines.append('      <Privacy/>')
            xml_lines.append('      <Comfort/>')
            xml_lines.append('      <Control/>')
            xml_lines.append('      <SocialDensity/>')
            xml_lines.append('      <HabitabilityScore/>')
            xml_lines.append('    </HabitatPerception>')
            
            # ---------------- Physiological Data ----------------
            xml_lines.append('    <PhysiologicalData>')
            
            if registro_fisio:
                heart_rate = registro_fisio.frecuencia_cardiaca if registro_fisio.frecuencia_cardiaca else ''
                sleep_hours = registro_fisio.horas_sueno if registro_fisio.horas_sueno else ''
                sleep_quality = registro_fisio.puntuacion_sueno if registro_fisio.puntuacion_sueno else ''
                
                xml_lines.append(f'      <HeartRate>{heart_rate}</HeartRate>')
                xml_lines.append(f'      <SleepHours>{sleep_hours}</SleepHours>')
                xml_lines.append(f'      <SleepQuality>{sleep_quality}</SleepQuality>')
                xml_lines.append('      <CortisolLevel/>')
            else:
                xml_lines.append('      <HeartRate/>')
                xml_lines.append('      <SleepHours/>')
                xml_lines.append('      <SleepQuality/>')
                xml_lines.append('      <CortisolLevel/>')
            
            xml_lines.append('    </PhysiologicalData>')
            xml_lines.append('  </Assessment>')
            
            assessment_counter += 1
    
    xml_lines.append('</AnalogCrewStudy>')
    
    return '\n'.join(xml_lines)