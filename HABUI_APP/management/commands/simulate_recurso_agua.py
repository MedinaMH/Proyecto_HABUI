import random
import time
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoAgua

class Command(BaseCommand):
    help = "Simula lecturas realistas de un tanque de agua (1000 L). Envía datos por WebSocket."

    # --------- PARÁMETROS DEL SIMULADOR ---------
    TANK_CAPACITY = 1000.0           # 1000 litros
    START_LEVEL_MIN = 700            # inicio entre 70% y 90%
    START_LEVEL_MAX = 900

    PH_BASE_MIN = 7.0
    PH_BASE_MAX = 7.8
    PH_NOISE = 0.05                  # ruido pequeño
    PH_DRIFT = 0.01                  # variación suave

    # consumo y llenado reales
    CONSUMO_MIN = -8                 # litros/min
    CONSUMO_MAX = -2
    LLENADO_MIN = 15
    LLENADO_MAX = 25

    UMBRAL_BAJO = 300                # si baja del 30% se llena
    UMBRAL_ALTO = 950                # si pasa 95% se estabiliza
    # ---------------------------------------------

    def add_arguments(self, parser):
        parser.add_argument('--recurso-id', type=int, required=True)
        parser.add_argument('--interval', type=float, default=5.0)
        parser.add_argument('--count', type=int, default=0)

    def handle(self, *args, **options):
        recurso_id = options['recurso_id']
        intervalo = options['interval']
        max_count = options['count']

        try:
            recurso = Recurso.objects.get(pk=recurso_id)
        except Recurso.DoesNotExist:
            self.stderr.write(f"Recurso id={recurso_id} no existe.")
            return

        channel_layer = get_channel_layer()

        # -------- INICIALIZACIÓN --------
        nivel = random.uniform(self.START_LEVEL_MIN, self.START_LEVEL_MAX)
        ph = random.uniform(self.PH_BASE_MIN, self.PH_BASE_MAX)
        ph_tendencia = random.choice([-1, 1]) * self.PH_DRIFT
        # -----------------------------------------

        i = 0
        try:
            while True:

                # ---------- SIMULACIÓN DEL NIVEL ----------
                if nivel <= self.UMBRAL_BAJO:
                    # activar llenado
                    variacion = random.uniform(self.LLENADO_MIN, self.LLENADO_MAX)
                elif nivel >= self.UMBRAL_ALTO:
                    # casi lleno → variación mínima
                    variacion = random.uniform(-1, 2)
                else:
                    # consumo normal
                    variacion = random.uniform(self.CONSUMO_MIN, self.CONSUMO_MAX)

                nivel += variacion

                # evitar valores imposibles
                nivel = max(0, min(self.TANK_CAPACITY, nivel))

                # convertir a porcentaje para la UI si lo deseas
                nivel_porcentaje = round((nivel / self.TANK_CAPACITY) * 100, 2)

                # ---------- SIMULACIÓN DEL PH ----------
                ph += ph_tendencia + random.uniform(-self.PH_NOISE, self.PH_NOISE)

                # rebotar suavemente en límites
                if ph < 6.5:
                    ph = 6.5
                    ph_tendencia = abs(ph_tendencia)
                elif ph > 8.5:
                    ph = 8.5
                    ph_tendencia = -abs(ph_tendencia)

                ph = round(ph, 2)

                # ------------ GUARDAR EN BD ------------
                reading = RecursoAgua.objects.create(
                    recurso=recurso,
                    nivel=nivel_porcentaje,
                    ph=ph
                )

                data = {
                    'id': reading.id,
                    'recurso': recurso.pk,
                    'nivel': reading.nivel,
                    'ph': reading.ph,
                    'fecha_hora': reading.fecha_hora.isoformat(),
                }

                # ------ ENVIAR POR WEBSOCKET ------
                async_to_sync(channel_layer.group_send)(
                    "agua",
                    {"type": "enviar_dato", "data": data}
                )

                self.stdout.write(f"[{i+1}] Simulado: {data}")
                i += 1

                if max_count and i >= max_count:
                    break

                time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write("Simulación detenida por usuario.")
