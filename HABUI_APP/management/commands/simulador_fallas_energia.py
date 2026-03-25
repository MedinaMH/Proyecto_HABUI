import csv
import time
import random
import uuid
from pathlib import Path
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoEnergia, MetricaMonitoreo


class Command(BaseCommand):
    help = (
        "Lee datos del CSV de energia y los envia por WebSocket al grupo 'energia'. "
        "Incluye simulacion de energia baja, drift de SoC y metricas."
    )

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=3.0,
                            help="Intervalo en segundos entre envios")
        parser.add_argument('--capacity', type=float, default=12000.0,
                            help="Capacidad del banco en Wh")
        parser.add_argument('--initial_soc', type=float, default=0.6,
                            help="SoC inicial (0..1)")
        parser.add_argument('--low_energy_mode', action='store_true',
                            help="Activa simulacion forzada de energia baja")
        parser.add_argument('--soc_drift', type=float, default=0.0,
                            help="Cambio forzado del SoC en puntos porcentuales por minuto. Ej: -5 baja 5 puntos por minuto")

    # ========================= HELPERS =========================

    def clasificar_estado_energia(self, soc):
        if soc <= 0.15:
            return "critical", "rojo", "Nivel critico de energia"
        elif soc <= 0.30:
            return "warning", "amarillo", "Nivel de advertencia de energia"
        else:
            return "normal", "verde", "Sistema energetico operativo"

    def obtener_estado_esperado(self, soc):
        if soc <= 0.15:
            return "critical"
        elif soc <= 0.30:
            return "warning"
        else:
            return "normal"

    def alerta_para_estado(self, estado):
        # Conservamos la logica original: alerta visible solo en CRITICAL
        return estado == "critical"

    def obtener_escenario(self, low_energy_mode, soc_drift):
        if low_energy_mode or soc_drift < 0:
            return "S5"
        return "S1"

    # ========================= MAIN =========================

    def handle(self, *args, **options):
        intervalo = options['interval']
        capacidad_bateria_wh = options['capacity']
        soc_inicial = options['initial_soc']
        low_energy_mode = options['low_energy_mode']
        soc_drift = options['soc_drift']  # puntos porcentuales por minuto

        channel_layer = get_channel_layer()
        data_file = Path(__file__).resolve().parent.parent.parent / "data" / "energia.csv"

        if not data_file.exists():
            self.stderr.write(f"No se encontro el archivo: {data_file}")
            return

        # ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='energia',
            defaults={'nombre': 'Banco de Energia'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Banco de Energia' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Banco de Energia' ya existe."))

        # =========================
        # Estado inicial de bateria
        # =========================
        bateria_wh = capacidad_bateria_wh * soc_inicial

        # =========================
        # Umbrales de energia
        # =========================
        soc_warning = 0.30
        soc_critical = 0.15

        # =========================
        # Areas del habitat
        # =========================
        areas_no_criticas = [
            "area.dormitorios",
            "area.bano",
            "area.pasillo",
            "area.exteriores"
        ]

        areas_criticas = [
            "area.sala_monitoreo"
        ]

        # =========================
        # Sugerencias ante falla
        # =========================
        sugerencias_criticas = [
            "Revisar estado del banco de baterias",
            "Verificar conexion y rendimiento de paneles solares",
            "Reducir consumo en sistemas no esenciales",
            "Comprobar inversor y regulador de carga",
            "Evaluar posible sobreconsumo inesperado"
        ]

        # =========================
        # Parametros base simulacion
        # =========================
        p_solar_max_normal = 3000.0
        eficiencia_bateria = 0.95
        ruido_wh = 5.0

        # =========================
        # Ajustes modo energia baja
        # =========================
        if low_energy_mode:
            self.stdout.write(self.style.WARNING("MODO ENERGIA BAJA ACTIVADO"))
            p_solar_max = 800.0
            factor_consumo = 1.4
        else:
            p_solar_max = p_solar_max_normal
            factor_consumo = 1.0

        escenario = self.obtener_escenario(low_energy_mode, soc_drift)

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Energia | Escenario: {escenario}"))
        self.stdout.write(f"Capacidad: {capacidad_bateria_wh} Wh | SoC inicial: {soc_inicial:.2f}")
        self.stdout.write(f"Intervalo: {intervalo}s | SoC drift: {soc_drift} puntos/min")

        try:
            with open(data_file, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                i = 0

                for row in reader:
                    tstart = timezone.now()

                    try:
                        tension = float(row.get("Tension/L1", row.get("Tensión/L1", 0)))
                        corriente = float(row.get("Corriente/L1", 0))
                        potencia = float(row.get("P. Activa/L1 +", 0)) * factor_consumo
                    except ValueError:
                        self.stderr.write(f"Fila {i+1}: valor invalido, se omite.")
                        continue

                    # =========================
                    # Generacion solar estimada
                    # =========================
                    potencia_norm = max(0.0, min(1.0, potencia / (p_solar_max + 1e-6)))
                    potencia_solar_estim = (
                        potencia_norm * p_solar_max * random.uniform(0.4, 0.8)
                        if low_energy_mode
                        else potencia_norm * p_solar_max * random.uniform(0.6, 1.0)
                    )

                    # =========================
                    # Flujo energetico
                    # =========================
                    p_bateria = potencia_solar_estim - potencia
                    delta_wh = (p_bateria * intervalo) / 3600.0

                    if delta_wh >= 0:
                        delta_wh *= eficiencia_bateria
                    else:
                        delta_wh /= eficiencia_bateria

                    delta_wh += random.uniform(-ruido_wh, ruido_wh)

                    # =========================
                    # Drift forzado de SoC
                    # =========================
                    # soc_drift esta en puntos porcentuales por minuto
                    # Ejemplo: -5 => -0.05 de SoC por minuto
                    delta_soc_drift = (soc_drift / 100.0) * (intervalo / 60.0)
                    delta_wh_drift = delta_soc_drift * capacidad_bateria_wh

                    # =========================
                    # Actualizar bateria
                    # =========================
                    bateria_wh = max(
                        0.0,
                        min(capacidad_bateria_wh, bateria_wh + delta_wh + delta_wh_drift)
                    )
                    soc = bateria_wh / capacidad_bateria_wh

                    # =========================
                    # Estado energetico
                    # =========================
                    estado, color, descripcion = self.clasificar_estado_energia(soc)
                    estado_esperado = self.obtener_estado_esperado(soc)

                    alerta_activada = self.alerta_para_estado(estado)
                    alerta_esperada = self.alerta_para_estado(estado_esperado)

                    clasificacion_correcta = (estado == estado_esperado)
                    alerta_correcta = (alerta_activada == alerta_esperada)

                    try:
                        reading = RecursoEnergia.objects.create(
                            recurso=recurso,
                            voltaje=round(tension, 4),
                            corriente=round(corriente, 4),
                            potencia=round(potencia, 4),
                            factor_potencia=None,
                            frecuencia=None
                        )

                        tgen = timezone.now()
                        sample_id = f"energia-{reading.id}-{uuid.uuid4().hex[:8]}"

                        metrica = MetricaMonitoreo.objects.create(
                            recurso="energia",
                            escenario=escenario,
                            sample_id=sample_id,
                            valor=round(soc * 100.0, 2),  # SoC en porcentaje para analisis
                            estado_esperado=estado_esperado,
                            estado_clasificado=estado,
                            clasificacion_correcta=clasificacion_correcta,
                            alerta_esperada=alerta_esperada,
                            alerta_activada=alerta_activada,
                            alerta_correcta=alerta_correcta,
                            tstart=tstart,
                            tgen=tgen,
                            lp_ms=(tgen - tstart).total_seconds() * 1000.0
                        )

                        lp_ms = metrica.lp_ms if metrica.lp_ms is not None else 0.0

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error al guardar energia/metricas: {str(e)}"))
                        tgen = timezone.now()
                        sample_id = f"energia-error-{uuid.uuid4().hex[:8]}"
                        reading = None
                        lp_ms = 0.0

                    data = {
                        "type": "energia_data",
                        "sample_id": sample_id,
                        "escenario": escenario,

                        "tension": round(tension, 4),
                        "corriente": round(corriente, 4),
                        "potencia": round(potencia, 4),

                        "battery": round(soc, 4),
                        "battery_wh": round(bateria_wh, 2),
                        "capacity_wh": capacidad_bateria_wh,

                        "solar_estimated_w": round(potencia_solar_estim, 2),

                        "energy_status": estado,
                        "estado": estado,
                        "estado_esperado": estado_esperado,
                        "descripcion": descripcion,
                        "color": color,

                        "low_energy_mode": low_energy_mode,
                        "soc_drift": soc_drift,
                        "timestamp": time.time(),

                        "areas": {
                            "critical": areas_criticas,
                            "non_critical": areas_no_criticas,
                            "shutdown": areas_no_criticas if estado == "critical" else []
                        },

                        "alerts": {
                            "show_alert": estado == "critical",
                            "level": estado,
                            "message": (
                                "Protocolo de mantenimiento energetico - Habitat Analogo"
                                if estado == "critical"
                                else "Sistema energetico operativo."
                            ),
                            "suggestions": (
                                sugerencias_criticas if estado == "critical" else []
                            )
                        },

                        "alerta_activada": alerta_activada,
                        "alerta_esperada": alerta_esperada,
                        "clasificacion_correcta": clasificacion_correcta,
                        "alerta_correcta": alerta_correcta,

                        "interval": intervalo,
                        "tstart": tstart.isoformat(),
                        "tgen": tgen.isoformat(),
                    }

                    async_to_sync(channel_layer.group_send)(
                        "energia",
                        {"type": "enviar_dato", "data": data}
                    )

                    self.stdout.write(
                        f"[{i+1}] Esc:{escenario} | SoC={soc:.2f} | Estado={estado} | "
                        f"LowMode={low_energy_mode} | Drift={soc_drift} | LP={lp_ms:.2f} ms"
                    )

                    i += 1
                    time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS("Simulacion detenida por el usuario."))