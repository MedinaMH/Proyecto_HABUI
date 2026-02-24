import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoCO2


class Command(BaseCommand):
    help = "Simula lecturas del sensor de CO₂ (ppm) y envía datos por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo CO2 (opcional)')
        parser.add_argument('--mode', type=str, default='normal',
                            choices=['optimo', 'advertencia', 'critico', 'normal', 'aleatorio', 'variacion'],
                            help='Modo de simulación: optimo, advertencia, critico, normal, aleatorio, variacion')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo para aumento, negativo para disminución)')
        parser.add_argument('--noise', type=float, default=5.0,
                            help='Nivel de ruido aleatorio (± ppm)')

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']  # Cambio por minuto (ppm/min)
        noise_level = options['noise']

        # Rangos según la especificación técnica
        RANGOS = {
            'optimo': {'min': 400, 'max': 1000, 'color': '🟢', 'desc': 'Óptimo'},
            'advertencia': {'min': 1000, 'max': 2000, 'color': '🟡', 'desc': 'Advertencia'},
            'critico': {'min': 2000, 'max': 3000, 'color': '🔴', 'desc': 'Crítico'},
            'normal': {'min': 500, 'max': 800, 'color': '🟢', 'desc': 'Normal'},  # Subconjunto del óptimo
            'variacion': {'min': 400, 'max': 2500, 'color': '🟠', 'desc': 'Variación amplia'},
        }

        channel_layer = get_channel_layer()

        # ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='co2',
            defaults={'nombre': 'Dióxido de Carbono (CO₂)'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Dióxido de Carbono' creado automáticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Dióxido de Carbono' ya existe."))

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador CO2 en modo: {mode}"))
        
        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternará entre diferentes estados cada 15 segundos")
        
        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate} ppm por minuto")
        
        self.stdout.write(f"Nivel de ruido: ±{noise_level} ppm")

        i = 1
        base_value = 600  # Valor inicial (dentro del rango óptimo)
        start_time = time.time()
        last_mode_change = time.time()
        current_mode = mode
        
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
                        weights = [0.5, 0.3, 0.2]  # Más probabilidad de óptimo
                        current_mode = random.choices(modes, weights=weights)[0]
                        last_mode_change = time.time()
                        self.stdout.write(f"Cambiando a modo: {current_mode} ({RANGOS[current_mode]['desc']})")
                
                # Modo variación: ciclo natural de CO2
                elif mode == 'variacion':
                    # Ciclo simulado de 2 minutos: sube gradualmente y luego baja bruscamente
                    cycle_time = (time.time() - start_time) % 120  # 2 minutos de ciclo
                    if cycle_time < 90:  # 1.5 minutos subiendo
                        base_value = 400 + (cycle_time / 90) * 2100  # De 400 a 2500
                    else:  # 0.5 minutos bajando rápidamente
                        base_value = 2500 - ((cycle_time - 90) / 30) * 2100  # De 2500 a 400
                
                # Modo normal: ligera variación alrededor de un valor base
                elif mode == 'normal':
                    if i == 1:
                        base_value = 600
                    else:
                        # Pequeña variación aleatoria con tendencia a volver al valor base
                        variation = random.uniform(-10, 10)
                        base_value += variation
                        # Fuerza de retorno al valor base (600 ppm)
                        return_force = (600 - base_value) * 0.1
                        base_value += return_force
                        # Aplicar deriva
                        base_value += drift
                        # Mantener en rango realista
                        base_value = max(350, min(1500, base_value))
                
                # Generar valor según el modo actual
                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]
                    
                    if mode in ['normal', 'variacion']:
                        # Para modos continuos, usar el valor base calculado
                        valor_base = base_value
                    else:
                        # Para modos fijos, generar dentro del rango
                        valor_base = random.uniform(rango['min'], rango['max'])
                    
                    # Añadir ruido aleatorio
                    noise = random.uniform(-noise_level, noise_level)
                    valor = valor_base + noise + drift
                    
                    # Asegurar que no salga de los límites físicos
                    valor = max(350, min(5000, valor))
                    
                    # Para modos específicos, mantener dentro del rango (excepto deriva muy fuerte)
                    if current_mode in ['optimo', 'advertencia', 'critico'] and mode != 'variacion':
                        valor = max(rango['min'], min(rango['max'], valor))
                
                else:
                    # Fallback
                    valor = 600 + random.uniform(-50, 50)

                valor = round(valor, 2)
                timestamp = datetime.now()

                # Determinar estado actual según los rangos
                estado = "Desconocido"
                color = "⚪"
                descripcion = ""
                
                if valor < 400:
                    estado = "POR DEBAJO DE ÓPTIMO"
                    color = "🟢"
                    descripcion = "Nivel muy bajo de CO₂"
                elif valor < 1000:
                    estado = "ÓPTIMO"
                    color = "🟢"
                    descripcion = "Indicador de ventilación adecuada y confort"
                elif valor < 2000:
                    estado = "ADVERTENCIA"
                    color = "🟡"
                    descripcion = "Somnolencia leve, reducción cognitiva"
                else:
                    estado = "CRÍTICO"
                    color = "🔴"
                    descripcion = "Riesgo fisiológico, hipercapnia progresiva"

                # ------------ GUARDAR EN BD ------------
                try:
                    # Crear registro en RecursoCO2
                    reading = RecursoCO2.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        concentracion=valor
                    )
                    
                    self.stdout.write(
                        f"[{i}] {color} {estado} - CO₂: {valor:.0f} ppm "
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
                    "estado": estado,
                    "color": color,
                    "descripcion": descripcion,
                    "modo_simulacion": current_mode if mode == 'aleatorio' else mode,
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "co2",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador CO2 finalizado."))
            
        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulación: {str(e)}"))


# Ejemplos de uso:
# python manage.py simular_co2 --mode optimo --interval 2
# python manage.py simular_co2 --mode advertencia --interval 1
# python manage.py simular_co2 --mode critico --interval 3
# python manage.py simular_co2 --mode normal --interval 2 --count 50
# python manage.py simular_co2 --mode aleatorio --interval 2 --noise 10
# python manage.py simular_co2 --mode variacion --interval 1
# python manage.py simular_co2 --mode normal --drift 20  # Aumento gradual de 20 ppm/min
# python manage.py simular_co2 --mode normal --drift -10 # Disminución gradual
# python manage.py simular_co2 --mode optimo --noise 5   # Óptimo con poco ruido