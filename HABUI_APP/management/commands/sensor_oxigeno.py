import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoOxigeno


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Oxígeno (O₂) y envía datos por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo oxígeno (opcional)')
        parser.add_argument('--mode', type=str, default='normal',
                            choices=['normal', 'critico_bajo', 'critico_alto', 'advertencia_baja', 
                                'advertencia_alta', 'optimo', 'aleatorio'],
                            help='Modo de simulación: normal, critico_bajo, critico_alto, advertencia_baja, advertencia_alta, optimo, aleatorio')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo/negativo)')

    def handle(self, *args, **options):

        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']  # Cambio por minuto

        # Rangos según la especificación
        RANGOS = {
            'critico_bajo': {'min': 15.0, 'max': 16.9, 'color': '🔴'},
            'critico_alto': {'min': 25.1, 'max': 30.0, 'color': '🔴'},
            'advertencia_baja': {'min': 17.0, 'max': 19.4, 'color': '🟡'},
            'advertencia_alta': {'min': 23.6, 'max': 25.0, 'color': '🟡'},
            'optimo': {'min': 19.5, 'max': 23.5, 'color': '🟢'},
            'normal': {'min': 20.0, 'max': 21.5, 'color': '🟢'},  # Subconjunto del óptimo
        }

        channel_layer = get_channel_layer()

        # ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='oxigeno',
            defaults={'nombre': 'Oxígeno'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxígeno' creado automáticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxígeno' ya existe."))

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador O₂ en modo: {mode}"))
        
        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternará entre diferentes estados")
        
        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate}% por minuto")

        i = 1
        base_value = 20.5  # Valor inicial
        start_time = time.time()
        
        try:
            while True:
                # Si hay limite de envíos
                if max_count and i > max_count:
                    break

                # Calcular deriva temporal
                elapsed_minutes = (time.time() - start_time) / 60.0
                drift = elapsed_minutes * drift_rate
                
                # Seleccionar modo si es aleatorio
                current_mode = mode
                if mode == 'aleatorio':
                    modes = ['critico_bajo', 'advertencia_baja', 'normal', 'advertencia_alta', 'critico_alto']
                    # Cambiar modo cada 10 lecturas
                    if i % 10 == 0:
                        current_mode = random.choice(modes)
                        self.stdout.write(f"Cambiando a modo: {current_mode}")

                # Generar valor según el modo
                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]
                    valor = round(
                        random.uniform(rango['min'], rango['max']) +
                        random.uniform(-0.05, 0.05) + drift,  # Ruido pequeño + deriva
                        4
                    )
                    # Asegurar que no salga del rango por la deriva
                    if current_mode != 'normal':
                        valor = max(rango['min'], min(rango['max'], valor))
                elif current_mode == 'normal':
                    # Modo normal con tendencia realista (ligeras variaciones)
                    if i == 1:
                        base_value = 20.5
                    else:
                        # Pequeña variación aleatoria
                        variation = random.uniform(-0.1, 0.1)
                        base_value += variation
                        # Mantener en rango óptimo
                        base_value = max(19.5, min(23.5, base_value + drift))
                    valor = round(base_value + random.uniform(-0.05, 0.05), 4)
                else:
                    valor = round(20.5 + random.uniform(-0.1, 0.1), 4)

                timestamp = datetime.now()

                # Determinar estado actual
                estado = "Desconocido"
                color = "⚪"
                if valor < 17.0:
                    estado = "CRÍTICO (BAJO)"
                    color = "🔴"
                elif valor <= 19.4:
                    estado = "ADVERTENCIA (BAJA)"
                    color = "🟡"
                elif valor <= 23.5:
                    estado = "ÓPTIMO"
                    color = "🟢"
                elif valor <= 25.0:
                    estado = "ADVERTENCIA (ALTA)"
                    color = "🟡"
                else:
                    estado = "CRÍTICO (ALTO)"
                    color = "🔴"

                # ------------ GUARDAR EN BD ------------
                try:
                    # Crear registro en RecursoOxigeno
                    reading = RecursoOxigeno.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        nivel=round(valor, 2)
                    )
                    
                    self.stdout.write(
                        f"[{i}] {color} {estado} - O₂: {valor:.2f}% "
                        f"(BD ID: {reading.id})"
                    )
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar en BD: {str(e)}"))
                    reading = None

                # Preparar datos para WebSocket
                data = {
                    "nivel": round(valor, 2),
                    "fecha_hora": timestamp.isoformat(),
                    "estado": estado,
                    "color": color,
                    "modo_simulacion": current_mode,
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "oxigeno",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador O₂ finalizado."))
        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida.")


# Ejemplos de uso:
# python manage.py simular_o2 --mode normal --interval 2
# python manage.py simular_o2 --mode critico_bajo --interval 1
# python manage.py simular_o2 --mode advertencia_alta --interval 3
# python manage.py simular_o2 --mode aleatorio --interval 2 --count 50
# python manage.py simular_o2 --mode normal --drift -0.5  # Disminución gradual
# python manage.py simular_o2 --mode normal --drift 0.3   # Aumento gradual