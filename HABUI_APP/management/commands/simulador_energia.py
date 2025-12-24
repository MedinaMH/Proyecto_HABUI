import csv
import time
import random
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from pathlib import Path

class Command(BaseCommand):
    help = "Lee datos del CSV de energía y los envía por WebSocket al grupo 'energia', modelando SoC en Wh."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=3.0,
                            help="Intervalo en segundos entre envíos")
        parser.add_argument('--capacity', type=float, default=12000.0,
                            help="Capacidad del banco en Wh (por defecto 12000 = 12 kWh)")
        parser.add_argument('--initial_soc', type=float, default=0.6,
                            help="SoC inicial (0..1), por defecto 0.6")

    def handle(self, *args, **options):
        intervalo = options['interval']
        CAPACIDAD_BATERIA_WH = options['capacity']  # ← Esto viene del parámetro
        SOC_INICIAL = options['initial_soc']
        channel_layer = get_channel_layer()
        data_file = Path(__file__).resolve().parent.parent.parent / "data" / "energia.csv"

        if not data_file.exists():
            self.stderr.write(f"No se encontró el archivo: {data_file}")
            return

        # Estado de energía en Wh
        bateria_wh = CAPACIDAD_BATERIA_WH * SOC_INICIAL

        # Parámetros de simulación
        P_SOLAR_MAX = 3000.0
        eficiencia_bateria = 0.95
        ruido_wh = 5.0

        try:
            with open(data_file, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                i = 0
                for row in reader:
                    try:
                        tension = float(row.get("Tensión/L1", 0))
                        corriente = float(row.get("Corriente/L1", 0))
                        potencia = float(row.get("P. Activa/L1 +", 0))
                    except ValueError:
                        self.stderr.write(f"Fila {i+1}: valor numérico inválido, se omite.")
                        continue

                    # Estimación de generación solar
                    potencia_norm = max(0.0, min(1.0, potencia / (P_SOLAR_MAX + 1e-6)))
                    potencia_solar_estim = potencia_norm * P_SOLAR_MAX * random.uniform(0.6, 1.0)

                    # Cálculo de flujo neto
                    p_bateria = potencia_solar_estim - potencia
                    delta_wh = (p_bateria * intervalo) / 3600.0

                    if delta_wh >= 0:
                        delta_wh *= eficiencia_bateria
                    else:
                        delta_wh /= eficiencia_bateria if eficiencia_bateria > 0 else 1

                    delta_wh += random.uniform(-ruido_wh, ruido_wh)

                    # Actualizar la bateria
                    bateria_wh = max(0.0, min(CAPACIDAD_BATERIA_WH, bateria_wh + delta_wh))
                    soc = bateria_wh / CAPACIDAD_BATERIA_WH

                    data = {
                        "tension": round(tension, 4),
                        "corriente": round(corriente, 4),
                        "potencia": round(potencia, 4),
                        "battery": round(soc, 4),
                        "battery_wh": round(bateria_wh, 2),
                        "solar_estimated_w": round(potencia_solar_estim, 2),
                        "capacity": CAPACIDAD_BATERIA_WH,  # ← ¡NUEVO PARÁMETRO!
                        "capacity_wh": CAPACIDAD_BATERIA_WH,
                        "initial_soc": SOC_INICIAL,
                        "interval": intervalo
                    }

                    # Enviar al grupo WebSocket
                    async_to_sync(channel_layer.group_send)(
                        "energia",
                        {"type": "enviar_dato", "data": data}
                    )

                    self.stdout.write(f"[{i+1}] Dato enviado: {data}")
                    i += 1
                    time.sleep(intervalo)
        except KeyboardInterrupt:
            self.stdout.write("⏹ Lectura interrumpida por el usuario.")