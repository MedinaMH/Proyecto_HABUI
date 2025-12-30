import csv
import time
import random
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from pathlib import Path


class Command(BaseCommand):
    help = (
        "Lee datos del CSV de energía y los envía por WebSocket al grupo 'energia'. "
        "Incluye simulación de energía baja y gestión de áreas."
    )

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=3.0,
                            help="Intervalo en segundos entre envíos")
        parser.add_argument('--capacity', type=float, default=12000.0,
                            help="Capacidad del banco en Wh")
        parser.add_argument('--initial_soc', type=float, default=0.6,
                            help="SoC inicial (0..1)")
        parser.add_argument('--low_energy_mode', action='store_true',
                            help="Activa simulación forzada de energía baja")

    def handle(self, *args, **options):
        intervalo = options['interval']
        CAPACIDAD_BATERIA_WH = options['capacity']
        SOC_INICIAL = options['initial_soc']
        LOW_ENERGY_MODE = options['low_energy_mode']

        channel_layer = get_channel_layer()
        data_file = Path(__file__).resolve().parent.parent.parent / "data" / "energia.csv"

        if not data_file.exists():
            self.stderr.write(f"No se encontró el archivo: {data_file}")
            return

        # =========================
        # Estado inicial de batería
        # =========================
        bateria_wh = CAPACIDAD_BATERIA_WH * SOC_INICIAL

        # =========================
        # Umbrales de energía
        # =========================
        SOC_WARNING = 0.30
        SOC_CRITICAL = 0.15

        # =========================
        # Áreas del hábitat
        # =========================
        AREAS_NO_CRITICAS = [
            "Dormitorios",
            "Baño",
            "Pasillo",
            "Exteriores"
        ]

        AREAS_CRITICAS = [
            "Sala de monitoreo"
        ]

        # =========================
        # Sugerencias ante falla
        # =========================
        SUGERENCIAS_CRITICAS = [
            "Revisar estado del banco de baterías",
            "Verificar conexión y rendimiento de paneles solares",
            "Reducir consumo en sistemas no esenciales",
            "Comprobar inversor y regulador de carga",
            "Evaluar posible sobreconsumo inesperado"
        ]

        # =========================
        # Parámetros base simulación
        # =========================
        P_SOLAR_MAX_NORMAL = 3000.0
        eficiencia_bateria = 0.95
        ruido_wh = 5.0

        # =========================
        # Ajustes modo energía baja
        # =========================
        if LOW_ENERGY_MODE:
            self.stdout.write(self.style.WARNING(
                "⚠ MODO ENERGÍA BAJA ACTIVADO"
            ))
            P_SOLAR_MAX = 800.0          # Muy baja generación
            FACTOR_CONSUMO = 1.4         # Mayor demanda
        else:
            P_SOLAR_MAX = P_SOLAR_MAX_NORMAL
            FACTOR_CONSUMO = 1.0

        try:
            with open(data_file, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                i = 0

                for row in reader:
                    try:
                        tension = float(row.get("Tensión/L1", 0))
                        corriente = float(row.get("Corriente/L1", 0))
                        potencia = float(row.get("P. Activa/L1 +", 0)) * FACTOR_CONSUMO
                    except ValueError:
                        self.stderr.write(f"Fila {i+1}: valor inválido, se omite.")
                        continue

                    # =========================
                    # Generación solar estimada
                    # =========================
                    potencia_norm = max(0.0, min(1.0, potencia / (P_SOLAR_MAX + 1e-6)))
                    potencia_solar_estim = (
                        potencia_norm * P_SOLAR_MAX * random.uniform(0.4, 0.8)
                        if LOW_ENERGY_MODE
                        else potencia_norm * P_SOLAR_MAX * random.uniform(0.6, 1.0)
                    )

                    # =========================
                    # Flujo energético
                    # =========================
                    p_bateria = potencia_solar_estim - potencia
                    delta_wh = (p_bateria * intervalo) / 3600.0

                    if delta_wh >= 0:
                        delta_wh *= eficiencia_bateria
                    else:
                        delta_wh /= eficiencia_bateria

                    delta_wh += random.uniform(-ruido_wh, ruido_wh)

                    # =========================
                    # Actualizar batería
                    # =========================
                    bateria_wh = max(0.0, min(CAPACIDAD_BATERIA_WH, bateria_wh + delta_wh))
                    soc = bateria_wh / CAPACIDAD_BATERIA_WH

                    # =========================
                    # Estado energético
                    # =========================
                    if soc <= SOC_CRITICAL:
                        energy_status = "critical"
                    elif soc <= SOC_WARNING:
                        energy_status = "warning"
                    else:
                        energy_status = "normal"

                    # =========================
                    # Paquete de datos WS
                    # =========================
                    data = {
                        "tension": round(tension, 4),
                        "corriente": round(corriente, 4),
                        "potencia": round(potencia, 4),

                        "battery": round(soc, 4),
                        "battery_wh": round(bateria_wh, 2),
                        "capacity_wh": CAPACIDAD_BATERIA_WH,

                        "solar_estimated_w": round(potencia_solar_estim, 2),

                        "energy_status": energy_status,
                        "low_energy_mode": LOW_ENERGY_MODE,
                        "timestamp": time.time(),

                        "areas": {
                            "critical": AREAS_CRITICAS,
                            "non_critical": AREAS_NO_CRITICAS,
                            "shutdown": AREAS_NO_CRITICAS if energy_status == "critical" else []
                        },

                        "alerts": {
                            "show_alert": energy_status == "critical",
                            "level": energy_status,
                            "message": (
                                "Nivel crítico de energía. Apagando áreas no esenciales."
                                if energy_status == "critical"
                                else "Sistema energético operativo."
                            ),
                            "suggestions": (
                                SUGERENCIAS_CRITICAS
                                if energy_status == "critical"
                                else []
                            )
                        },

                        "interval": intervalo
                    }

                    async_to_sync(channel_layer.group_send)(
                        "energia",
                        {"type": "enviar_dato", "data": data}
                    )

                    self.stdout.write(
                        f"[{i+1}] SoC={soc:.2f} | Estado={energy_status} | LowMode={LOW_ENERGY_MODE}"
                    )

                    i += 1
                    time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("⏹ Simulación detenida por el usuario."))
