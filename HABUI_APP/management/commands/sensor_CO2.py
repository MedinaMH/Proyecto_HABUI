import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import RecursoCO2


class Command(BaseCommand):
    help = "Simula lecturas del sensor de CO₂ (ppm) y envía datos por WebSocket."

    # Parámetros realistas de CO2 (ppm)
    CO2_MIN = 350
    CO2_MAX = 2000
    CO2_NOISE = 10  # pequeñas variaciones

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=True,
                            help='ID del recurso tipo CO2')

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']

        channel_layer = get_channel_layer()

        current_value = random.uniform(self.CO2_MIN, self.CO2_MAX)
        i = 1
        count = 0
        
        try:
            while max_count == 0 or count < max_count:
                # Simulación con ruido
                noise = random.uniform(-self.CO2_NOISE, self.CO2_NOISE)
                current_value = max(self.CO2_MIN, min(self.CO2_MAX, current_value + noise))

                timestamp = datetime.now()

                # ------------ GUARDAR EN BD ------------
                try:
                    # Crear registro en RecursoCO2
                    reading = RecursoCO2.objects.create(
                        recurso_id=recurso_id,
                        concentracion=round(current_value, 2)
                    )
                    
                    self.stdout.write(f"[{i}] Registro CO₂ guardado en BD - ID: {reading.id}")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar en BD: {str(e)}"))

                # Preparar datos para WebSocket (manteniendo la estructura original)
                data = {
                    "valor": round(current_value, 2),
                    "fecha_hora": timestamp.isoformat(),
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "co2",
                    {"type": "enviar_dato", "data": data}
                )

                self.stdout.write(f"[{i}] Dato enviado: {data}")

                i += 1
                count += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador CO₂ finalizado."))
            
        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulación: {str(e)}"))