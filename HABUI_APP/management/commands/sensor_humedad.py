import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoHumedad


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Humedad (%) y envía datos por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo humedad (opcional)')
        parser.add_argument('--mode', type=str, default='optimo',
                            choices=['optimo', 'advertencia', 'critico', 'normal', 'aleatorio', 'variacion'],
                            help='Modo de simulación: optimo, advertencia, critico, normal, aleatorio, variacion')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo para aumento, negativo para disminución)')
        parser.add_argument('--noise', type=float, default=0.5,
                            help='Nivel de ruido aleatorio (± %)')

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']  # Cambio por minuto (%/min)
        noise_level = options['noise']

        # Rangos según el nuevo semáforo de 3 estados
        RANGOS = {
            'optimo': {'min': 40.0, 'max': 60.0, 'color': '🟢', 'desc': 'Minimiza patógenos, maximiza confort respiratorio'},
            'advertencia': {'min': 30.0, 'max': 70.0, 'color': '🟡', 'desc': 'Riesgo de sequedad o proliferación microbiana'},
            'critico': {'min': 0.0, 'max': 100.0, 'color': '🔴', 'desc': 'Irritación respiratoria o crecimiento de moho'},
            'normal': {'min': 45.0, 'max': 55.0, 'color': '🟢', 'desc': 'Variación normal dentro del rango óptimo'},
            'variacion': {'min': 20.0, 'max': 90.0, 'color': '🟠', 'desc': 'Variación amplia entre estados'},
        }

        channel_layer = get_channel_layer()

        # ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='humedad',
            defaults={'nombre': 'Sensor de Humedad Relativa (%)'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Humedad Relativa (%)' creado automáticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Humedad Relativa (%)' ya existe."))

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Humedad en modo: {mode}"))
        
        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternará entre diferentes estados cada 15 segundos")
        
        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate} % por minuto")
        
        self.stdout.write(f"Nivel de ruido: ±{noise_level} %")
        self.stdout.write("\nRangos de referencia:")
        self.stdout.write(" ÓPTIMO: 40.0 - 60.0 % (Confort respiratorio)")
        self.stdout.write(" ADVERTENCIA: 30.0 - 40.0 % o 60.0 - 70.0 % (Riesgo moderado)")
        self.stdout.write(" CRÍTICO: < 30.0 % o > 70.0 % (Riesgo fisiológico)")

        i = 1
        base_value = 50.0  # Valor inicial (centro del rango óptimo)
        start_time = time.time()
        last_mode_change = time.time()
        current_mode = mode
        
        # Para modo 'advertencia', decidir si será advertencia baja o alta
        advertencia_submodo = 'baja'  # Puede ser 'baja' (30-40) o 'alta' (60-70)
        
        try:
            while True:
                # Si hay límite de envíos
                if max_count and i > max_count:
                    break

                # Calcular deriva temporal
                elapsed_minutes = (time.time() - start_time) / 60.0
                drift = elapsed_minutes * drift_rate
                
                # Modo aleatorio: cambiar de estado periódicamente
                if mode == 'aleatorio':
                    # Cambiar modo cada 15 segundos
                    if time.time() - last_mode_change > 15:
                        modes = ['optimo', 'advertencia', 'critico']
                        weights = [0.6, 0.3, 0.1]  # Más probabilidad de óptimo
                        current_mode = random.choices(modes, weights=weights)[0]
                        last_mode_change = time.time()
                        
                        # Para modo advertencia, elegir submodo
                        if current_mode == 'advertencia':
                            advertencia_submodo = random.choice(['baja', 'alta'])
                            if advertencia_submodo == 'baja':
                                rango_min, rango_max = 30.0, 40.0
                            else:
                                rango_min, rango_max = 60.0, 70.0
                            self.stdout.write(f"Cambiando a modo: {current_mode} ({advertencia_submodo}: {rango_min}-{rango_max}%)")
                        else:
                            self.stdout.write(f"Cambiando a modo: {current_mode} ({RANGOS[current_mode]['desc']})")
                
                # Modo variación: ciclo natural de humedad
                elif mode == 'variacion':
                    # Ciclo simulado de 10 minutos: sube y baja gradualmente
                    cycle_time = (time.time() - start_time) % 600  # 10 minutos de ciclo
                    if cycle_time < 300:  # 5 minutos subiendo
                        base_value = 20.0 + (cycle_time / 300) * 50.0  # De 20 a 70%
                    else:  # 5 minutos bajando
                        base_value = 70.0 - ((cycle_time - 300) / 300) * 50.0  # De 70 a 20%
                
                # Modo normal: ligera variación dentro del rango óptimo
                elif mode == 'normal':
                    if i == 1:
                        base_value = 50.0
                    else:
                        # Pequeña variación aleatoria con tendencia a volver al valor base
                        variation = random.uniform(-1.0, 1.0)
                        base_value += variation
                        # Fuerza de retorno al valor base (50%)
                        return_force = (50.0 - base_value) * 0.1
                        base_value += return_force
                        # Aplicar deriva
                        base_value += drift
                        # Mantener en rango realista
                        base_value = max(10.0, min(90.0, base_value))
                
                # Generar valor según el modo actual
                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]
                    
                    # Ajustar rango para modo 'advertencia' según submodo
                    if current_mode == 'advertencia' and mode in ['aleatorio', 'advertencia']:
                        if advertencia_submodo == 'baja':
                            rango_min, rango_max = 30.0, 40.0
                        else:  # 'alta'
                            rango_min, rango_max = 60.0, 70.0
                    else:
                        rango_min, rango_max = rango['min'], rango['max']
                    
                    if mode in ['normal', 'variacion']:
                        # Para modos continuos, usar el valor base calculado
                        valor_base = base_value
                    elif current_mode == 'advertencia':
                        # Para advertencia, generar dentro del subrango específico
                        valor_base = random.uniform(rango_min, rango_max)
                    else:
                        # Para modos fijos, generar dentro del rango
                        valor_base = random.uniform(rango_min, rango_max)
                    
                    # Añadir ruido aleatorio
                    noise = random.uniform(-noise_level, noise_level)
                    valor = valor_base + noise + drift
                    
                    # Asegurar que no salga de los límites físicos
                    valor = max(0.0, min(100.0, valor))
                    
                    # Para modos específicos, mantener dentro del rango (excepto deriva muy fuerte)
                    if current_mode in ['optimo', 'advertencia', 'critico'] and mode != 'variacion':
                        if current_mode == 'advertencia':
                            # Mantener dentro del subrango de advertencia
                            valor = max(rango_min, min(rango_max, valor))
                        else:
                            # Mantener dentro del rango general
                            valor = max(rango['min'], min(rango['max'], valor))
                
                else:
                    # Fallback
                    valor = 50.0 + random.uniform(-5, 5)

                valor = round(valor, 2)
                timestamp = datetime.now()

                # Determinar estado actual según los rangos (semaforo)
                estado = "Desconocido"
                color = "⚪"
                descripcion = ""
                
                if valor < 30.0:
                    estado = "CRÍTICO"
                    color = "🔴"
                    descripcion = "Irritación respiratoria por sequedad extrema"
                elif valor < 40.0:
                    estado = "ADVERTENCIA"
                    color = "🟡"
                    descripcion = "Riesgo de sequedad respiratoria"
                elif valor < 60.0:
                    estado = "ÓPTIMO"
                    color = "🟢"
                    descripcion = "Minimiza patógenos, maximiza confort respiratorio"
                elif valor <= 70.0:
                    estado = "ADVERTENCIA"
                    color = "🟡"
                    descripcion = "Riesgo de proliferación microbiana"
                else:
                    estado = "CRÍTICO"
                    color = "🔴"
                    descripcion = "Riesgo de crecimiento de moho e irritación respiratoria"

                # ------------ GUARDAR EN BD ------------
                try:
                    # Crear registro en RecursoHumedad
                    reading = RecursoHumedad.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        valor=valor
                    )
                    
                    # Mostrar información detallada
                    hum_str = f"{valor:.1f}%"
                    if estado == "ÓPTIMO":
                        style = self.style.SUCCESS
                    elif estado == "ADVERTENCIA":
                        style = self.style.WARNING
                    else:
                        style = self.style.ERROR
                    
                    self.stdout.write(
                        f"[{i}] {color} {estado:12} - Humedad: {hum_str:>6} "
                        f"({descripcion[:30]}...) "
                        f"(BD ID: {reading.id})"
                    )
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar en BD: {str(e)}"))
                    reading = None

                # Preparar datos para WebSocket
                data = {
                    "valor": valor,
                    "fecha_hora": timestamp.isoformat(),
                    "unidad": "%",
                    "estado": estado,
                    "color": color,
                    "descripcion": descripcion,
                    "modo_simulacion": current_mode if mode == 'aleatorio' else mode,
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "humedad",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador Humedad finalizado."))
            
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulación detenida."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulación: {str(e)}"))


# Ejemplos de uso:
# python manage.py simular_humedad --mode optimo --interval 2
# python manage.py simular_humedad --mode advertencia --interval 1
# python manage.py simular_humedad --mode critico --interval 3
# python manage.py simular_humedad --mode normal --interval 2 --count 50
# python manage.py simular_humedad --mode aleatorio --interval 2 --noise 0.8
# python manage.py simular_humedad --mode variacion --interval 1
# python manage.py simular_humedad --mode normal --drift 1.0   # Aumento gradual de 1%/min
# python manage.py simular_humedad --mode normal --drift -0.5  # Disminución gradual
# python manage.py simular_humedad --mode optimo --noise 0.3   # Óptimo con poco ruido