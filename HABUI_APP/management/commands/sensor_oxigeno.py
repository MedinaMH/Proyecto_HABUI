import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Oxígeno (O₂) y envía datos por WebSocket."

    # Parámetros realistas de O₂ (en %)
    O2_MIN = 19.5
    O2_MAX = 22.0
    O2_NOISE = 0.05  # ruido pequeño

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo oxígeno (opcional)')

    def handle(self, *args, **options):

        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']

        channel_layer = get_channel_layer()

        # Obtener recurso O2
        # if recurso_id:
        #     recurso = Recurso.objects.filter(id=recurso_id, tipo='oxigeno').first()
        # else:
        #     recurso = Recurso.objects.filter(tipo='oxigeno').first()

        # if not recurso:
        #     self.stdout.write(self.style.ERROR("❌ No existe Recurso tipo 'oxigeno'."))
        #     return

        self.stdout.write(self.style.SUCCESS("Iniciando simulador O₂..."))

        i = 1
        try:
            while True:
                # Si hay limite de envíos
                if max_count and i > max_count:
                    break

                # Generar valor realista O2 (%)
                valor = round(
                    random.uniform(self.O2_MIN, self.O2_MAX) +
                    random.uniform(-self.O2_NOISE, self.O2_NOISE),
                    4
                )

                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                data = {
                    "nivel": valor,
                    "fecha_hora": timestamp,
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "oxigeno",
                    {"type": "enviar_dato", "data": data}
                )

                self.stdout.write(f"[{i}] Dato enviado: {data}")

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador O2 finalizado."))
        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida.")
