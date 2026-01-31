import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoOxigeno


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

# ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='oxigeno',
            defaults={'nombre': 'Oxígeno'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxígeno Cabina' creado automáticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxígeno Cabina' ya existe."))

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

                timestamp = datetime.now()

                # ------------ GUARDAR EN BD ------------
                try:
                    # Crear registro en RecursoCO2
                    reading = RecursoOxigeno.objects.create(
                        recurso_id=recurso_id,
                        nivel=round(valor, 2)
                    )
                    
                    self.stdout.write(f"[{i}] Registro O₂ guardado en BD - ID: {reading.id}")
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar en BD: {str(e)}"))
                
                # Preparar datos para WebSocket
                data = {
                    "nivel": valor,
                    "fecha_hora": timestamp.isoformat(),
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
