import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso


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
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo CO2 (opcional)')

    def handle(self, *args, **options):

        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']

        channel_layer = get_channel_layer()

        # Obtener recurso CO2
        # recurso = None
        # if recurso_id:
        #     recurso = Recurso.objects.filter(id=recurso_id, tipo='co2').first()
        # else:
        #     recurso = Recurso.objects.filter(tipo='co2').first()

        # if not recurso:
        #     self.stdout.write(self.style.ERROR("❌ No existe un recurso de CO₂ en la BD."))
        #     return

        # self.stdout.write(self.style.SUCCESS(f"📡 Simulando lecturas de CO₂ para Recurso ID {recurso.id}"))

        current_value = random.uniform(self.CO2_MIN, self.CO2_MAX)
        i = 1
        count = 0
        try:
            while max_count == 0 or count < max_count:

                # Simulación con ruido
                noise = random.uniform(-self.CO2_NOISE, self.CO2_NOISE)
                current_value = max(self.CO2_MIN, min(self.CO2_MAX, current_value + noise))

                timestamp = datetime.now().isoformat()

                data = {
                    "valor": round(current_value, 2),
                    "fecha_hora": timestamp,
                }

            # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "co2",
                    {"type": "enviar_dato", "data": data}
                )

                self.stdout.write(f"[{i}] Dato enviado: {data}")

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador CO₂  finalizado."))
        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida.")
