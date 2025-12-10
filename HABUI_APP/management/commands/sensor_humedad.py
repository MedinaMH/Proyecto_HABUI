import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoHumedad


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Humedad (%) y envía datos por WebSocket."

    # Parámetros realistas de humedad relativa
    HUM_MIN = 20.0     # % mínima (muy seco)
    HUM_MAX = 95.0     # % máxima (muy húmedo)
    HUM_NOISE = 0.5    # variación pequeña
    
    # Niveles ideales de humedad
    HUM_IDEAL_MIN = 40.0
    HUM_IDEAL_MAX = 60.0

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo humedad (opcional)')
        parser.add_argument('--modo', type=str, default='normal',
                            choices=['normal', 'seco', 'humedo', 'estable'],
                            help='Modo de simulación: normal, seco, humedo, estable')

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        modo = options['modo']

        channel_layer = get_channel_layer()

        # Obtener recurso Humedad
        # if recurso_id:
        #     recurso = Recurso.objects.filter(id=recurso_id, tipo='humedad').first()
        # else:
        #     recurso = Recurso.objects.filter(tipo='humedad').first()

        # if not recurso:
        #     self.stdout.write(self.style.ERROR("❌ No existe Recurso tipo 'humedad'."))
        #     return
        # self.stdout.write(f"📊 Recurso asociado: {recurso.nombre}")
        self.stdout.write(self.style.SUCCESS(f"💧 Iniciando simulador Humedad (modo: {modo})..."))
        

        # Ajustar parámetros según el modo
        if modo == 'estable':
            hum_min, hum_max = 45.0, 55.0
            current_hum = 50.0
        elif modo == 'seco':
            hum_min, hum_max = 20.0, 35.0
            current_hum = 28.0
        elif modo == 'humedo':
            hum_min, hum_max = 70.0, 90.0
            current_hum = 80.0
        else:  # normal
            hum_min, hum_max = self.HUM_MIN, self.HUM_MAX
            current_hum = random.uniform(45.0, 65.0)

        i = 1
        ciclo_hum = 0  # Para simular ciclos diarios
        
        try:
            while True:
                if max_count and i > max_count:
                    break

                # Simulación con comportamiento más realista
                if modo == 'normal':
                    # Simular ciclo diario (más humedad en la noche/madrugada)
                    hora_actual = datetime.now().hour
                    ciclo_hum = 0
                    
                    if 0 <= hora_actual < 6:  # Madrugada
                        ciclo_hum = random.uniform(0, 5)
                    elif 6 <= hora_actual < 12:  # Mañana
                        ciclo_hum = random.uniform(-2, 2)
                    elif 12 <= hora_actual < 18:  # Tarde
                        ciclo_hum = random.uniform(-3, 0)
                    else:  # Noche
                        ciclo_hum = random.uniform(0, 3)
                    
                    current_hum += ciclo_hum
                else:
                    # Modos específicos con variaciones pequeñas
                    variacion = random.uniform(-1.0, 1.0)
                    current_hum += variacion

                # Mantener dentro de límites
                current_hum = max(hum_min, min(hum_max, current_hum))
                
                valor = round(current_hum, 2)
                timestamp = datetime.now()
                timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")

                data = {
                    "valor": valor,
                    "fecha_hora": timestamp_str,
                    # "recurso_id": recurso.id,
                    # "recurso_nombre": recurso.nombre,
                    "unidad": "%",
                    "estado": self._determinar_estado(valor)
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "humedad",  # Nombre del grupo WebSocket
                    {"type": "enviar_dato", "data": data}
                )

                # Guardar en base de datos
                # try:
                #     RecursoHumedad.objects.create(
                #         recurso=recurso,
                #         valor=valor,
                #         fecha_hora=timestamp
                #     )
                #     self.stdout.write(f"[{i}] 💧 {valor}% | Estado: {data['estado']} | ✓")
                # except Exception as e:
                #     self.stdout.write(f"[{i}] ⚠️  {valor}% | Error: {str(e)}")
                
                self.stdout.write(f"[{i}] Dato enviado: {data}")
                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("✅ Simulador Humedad finalizado."))
            
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("⏹️  Simulación detenida."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))

    def _determinar_estado(self, valor):
        """Determina el estado según la humedad"""
        if valor < 30:
            return "MUY SECO"
        elif valor < 40:
            return "SECO"
        elif valor < 60:
            return "IDEAL"
        elif valor < 70:
            return "HÚMEDO"
        else:
            return "MUY HÚMEDO"