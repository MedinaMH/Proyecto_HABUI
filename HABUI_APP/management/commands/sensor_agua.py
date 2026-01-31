import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoAgua


class Command(BaseCommand):
    help = "Simula lecturas realistas de un tanque de agua (1000 L). Envía datos por WebSocket."

    # --------- PARÁMETROS DEL SIMULADOR ---------
    TANK_CAPACITY = 1000.0           # 1000 litros
    START_LEVEL_MIN = 700            # inicio entre 70% y 90% (litros)
    START_LEVEL_MAX = 900

    # consumo y llenado reales (litros por ciclo)
    CONSUMO_MIN = -8                 # litros/ciclo
    CONSUMO_MAX = -2
    LLENADO_MIN = 15
    LLENADO_MAX = 25

    UMBRAL_BAJO = 300                # 300 litros (30%) - activa llenado
    UMBRAL_ALTO = 950                # 950 litros (95%) - detiene llenado
    # ---------------------------------------------

    def add_arguments(self, parser):
        parser.add_argument('--recurso-id', type=int, required=True,
                            help='ID del recurso agua en la base de datos')
        parser.add_argument('--interval', type=float, default=5.0,
                            help='Intervalo entre lecturas en segundos')
        parser.add_argument('--count', type=int, default=0,
                            help='Número total de lecturas (0 = infinito)')
        parser.add_argument('--modo', type=str, default='normal',
                            choices=['normal', 'llenado', 'consumo', 'critico'],
                            help='Modo de simulación: normal, llenado, consumo, critico')

    def handle(self, *args, **options):
        recurso_id = options['recurso_id']
        intervalo = options['interval']
        max_count = options['count']
        modo = options['modo']

        # ------------------ AUTO-CREAR / OBTENER RECURSO ------------------
        recurso, creado = Recurso.objects.get_or_create(
            tipo='agua',
            defaults={'nombre': 'Agua'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Agua Cabina' creado automáticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Agua Cabina' ya existe."))

        self.stdout.write(self.style.SUCCESS("Iniciando simulador Agua..."))
        channel_layer = get_channel_layer()

        # -------- INICIALIZACIÓN SEGÚN MODO --------
        if modo == 'critico':
            nivel = random.uniform(50, 150)  # 5-15% (crítico)
        elif modo == 'llenado':
            nivel = random.uniform(200, 400)  # 20-40% (para simular llenado)
        elif modo == 'consumo':
            nivel = random.uniform(800, 950)  # 80-95% (para simular consumo)
        else:  # normal
            nivel = random.uniform(self.START_LEVEL_MIN, self.START_LEVEL_MAX)
        
        estado = "NORMAL"
        i = 0
        llenando = False
        
        self.stdout.write(self.style.SUCCESS(f"💧 Iniciando simulador de tanque de agua"))
        self.stdout.write(f"📊 Tanque: {self.TANK_CAPACITY} L | Recurso: {recurso.nombre}")
        self.stdout.write(f"⚙️  Modo: {modo} | Intervalo: {intervalo}s")

        try:
            while True:
                # ---------- SIMULACIÓN DEL NIVEL ----------
                if modo == 'normal':
                    # Lógica inteligente de llenado/consumo
                    if nivel <= self.UMBRAL_BAJO:
                        # Nivel crítico, activar llenado
                        variacion = random.uniform(self.LLENADO_MIN, self.LLENADO_MAX)
                        estado = "LLENANDO"
                        llenando = True
                    elif nivel >= self.UMBRAL_ALTO:
                        # Tanque casi lleno, consumo mínimo o ligero llenado
                        variacion = random.uniform(-2, 1)
                        estado = "ESTABLE"
                        llenando = False
                    else:
                        # Consumo normal con pequeña probabilidad de llenado
                        if random.random() < 0.05:  # 5% de probabilidad de llenado aleatorio
                            variacion = random.uniform(5, 15)
                            estado = "LLENANDO"
                            llenando = True
                        else:
                            variacion = random.uniform(self.CONSUMO_MIN, self.CONSUMO_MAX)
                            estado = "CONSUMIENDO"
                            llenando = False
                
                elif modo == 'llenado':
                    # Simulación continua de llenado
                    variacion = random.uniform(20, 30)
                    estado = "LLENANDO RÁPIDO"
                    llenando = True
                
                elif modo == 'consumo':
                    # Simulación continua de consumo
                    variacion = random.uniform(-10, -5)
                    estado = "CONSUMIENDO"
                    llenando = False
                
                elif modo == 'critico':
                    # Nivel crítico con llenado de emergencia
                    if nivel < 100:
                        variacion = random.uniform(30, 40)  # Llenado rápido
                        estado = "EMERGENCIA - LLENANDO"
                    else:
                        variacion = random.uniform(-3, 2)  # Fluctuación
                        estado = "CRÍTICO"
                    llenando = True

                # Aplicar variación
                nivel += variacion
                
                # Limitar valores entre 0 y capacidad máxima
                nivel = max(0, min(self.TANK_CAPACITY, nivel))
                
                # Calcular porcentaje para UI
                nivel_porcentaje = round((nivel / self.TANK_CAPACITY) * 100, 2)
                nivel_litros = round(nivel, 2)

                # Determinar color/estado visual
                if nivel_porcentaje < 20:
                    estado_visual = "CRÍTICO"
                    color = "#ff4444"
                elif nivel_porcentaje < 40:
                    estado_visual = "BAJO"
                    color = "#ffaa00"
                elif nivel_porcentaje < 70:
                    estado_visual = "NORMAL"
                    color = "#00bfff"
                else:
                    estado_visual = "ÓPTIMO"
                    color = "#00cc66"

                # Timestamp actual
                timestamp = datetime.now()
                
                # ------------ GUARDAR EN BD ------------
                try:
                    reading = RecursoAgua.objects.create(
                        recurso=recurso,
                        nivel=nivel_porcentaje
                    )
                    
                    # Preparar datos para WebSocket
                    data = {
                        'id': reading.id,
                        'recurso': recurso.pk,
                        'recurso_nombre': recurso.nombre,
                        'nivel': nivel_porcentaje,        # Porcentaje (0-100%)
                        'litros': nivel_litros,           # Litros reales
                        'capacidad': self.TANK_CAPACITY,  # Capacidad total
                        'estado': estado,
                        'estado_visual': estado_visual,
                        'color': color,
                        'llenando': llenando,
                        'fecha_hora': timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        'timestamp_iso': timestamp.isoformat(),
                        'unidad': '%'
                    }

                    # ------ ENVIAR POR WEBSOCKET ------
                    async_to_sync(channel_layer.group_send)(
                        "agua",
                        {
                            "type": "enviar_dato", 
                            "data": data
                        }
                    )

                    # Mostrar en consola con colores
                    if nivel_porcentaje < 20:
                        estilo = self.style.ERROR
                    elif nivel_porcentaje < 40:
                        estilo = self.style.WARNING
                    else:
                        estilo = self.style.SUCCESS
                    
                    self.stdout.write(estilo(
                        f"[{i+1}] {nivel_porcentaje}% | {nivel_litros} L | {estado} | {estado_visual}"
                    ))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar: {str(e)}"))

                i += 1

                # Verificar límite de lecturas
                if max_count > 0 and i >= max_count:
                    self.stdout.write(self.style.SUCCESS(f"Simulación completada ({i} lecturas)"))
                    break

                time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulación detenida por el usuario."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulación: {str(e)}"))