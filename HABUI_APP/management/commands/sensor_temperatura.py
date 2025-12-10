import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoTemperatura


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Temperatura (°C) y envía datos por WebSocket."

    # Parámetros realistas de temperatura ambiente
    TEMP_MIN = 15.0    # °C mínima
    TEMP_MAX = 35.0    # °C máxima
    TEMP_NOISE = 0.2   # variación pequeña
    
    # Temperaturas óptimas para diferentes escenarios
    TEMP_CONFORT = 22.0
    TEMP_ALERTA_BAJA = 16.0
    TEMP_ALERTA_ALTA = 30.0

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Número de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo temperatura (opcional)')
        parser.add_argument('--modo', type=str, default='normal',
                            choices=['normal', 'caliente', 'frio', 'estable'],
                            help='Modo de simulación: normal, caliente, frio, estable')

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        modo = options['modo']

        channel_layer = get_channel_layer()

        # Obtener recurso Temperatura
        # if recurso_id:
        #     recurso = Recurso.objects.filter(id=recurso_id, tipo='temperatura').first()
        # else:
        #     recurso = Recurso.objects.filter(tipo='temperatura').first()

        # if not recurso:
        #     self.stdout.write(self.style.ERROR("No existe Recurso tipo 'temperatura'."))
        #     return

        # self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Temperatura (modo: {modo})..."))
        # self.stdout.write(f"📊 Recurso asociado: {recurso.nombre}")

        # Ajustar parámetros según el modo
        if modo == 'estable':
            temp_min, temp_max = 20.0, 24.0
            current_temp = 22.0
        elif modo == 'caliente':
            temp_min, temp_max = 28.0, 35.0
            current_temp = 30.0
        elif modo == 'frio':
            temp_min, temp_max = 15.0, 18.0
            current_temp = 16.5
        else:  # normal
            temp_min, temp_max = self.TEMP_MIN, self.TEMP_MAX
            current_temp = random.uniform(20.0, 25.0)

        i = 1
        tendencia = 0  # -1: bajando, 0: estable, 1: subiendo
        cambio_tendencia = 0
        
        try:
            while True:
                if max_count and i > max_count:
                    break

                # Simulación con comportamiento más realista
                if modo == 'normal':
                    # Cambios de tendencia ocasionales
                    if random.random() < 0.1:  # 10% de probabilidad
                        tendencia = random.choice([-1, 0, 1])
                        cambio_tendencia = random.uniform(0.1, 0.5)
                    
                    # Aplicar tendencia
                    current_temp += tendencia * cambio_tendencia
                    
                    # Oscilaciones naturales
                    oscilacion = random.uniform(-self.TEMP_NOISE, self.TEMP_NOISE)
                    current_temp += oscilacion
                else:
                    # Modos específicos con pequeñas variaciones
                    variacion = random.uniform(-0.3, 0.3)
                    current_temp += variacion

                # Mantener dentro de límites
                current_temp = max(temp_min, min(temp_max, current_temp))
                
                valor = round(current_temp, 2)
                timestamp = datetime.now()
                timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")

                data = {
                    "valor": valor,
                    "fecha_hora": timestamp_str,
                    # "recurso_id": recurso.id,
                    # "recurso_nombre": recurso.nombre,
                    "unidad": "°C",
                    "estado": self._determinar_estado(valor)
                }

                # Enviar a WebSocket
                async_to_sync(channel_layer.group_send)(
                    "temperatura",  # Nombre del grupo WebSocket
                    {"type": "enviar_dato", "data": data}
                )

                # Guardar en base de datos
                # try:
                #     RecursoTemperatura.objects.create(
                #         recurso=recurso,
                #         valor=valor,
                #         fecha_hora=timestamp
                #     )
                #     self.stdout.write(f"[{i}]  {valor}°C | Estado: {data['estado']} | ✓")
                # except Exception as e:
                #     self.stdout.write(f"[{i}]  {valor}°C | Error: {str(e)}")
                self.stdout.write(f"[{i}] Dato enviado: {data}")
                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador Temperatura finalizado."))
            
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulación detenida."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))

    def _determinar_estado(self, valor):
        """Determina el estado según la temperatura"""
        if valor < 16:
            return "MUY FRÍO"
        elif valor < 18:
            return "FRÍO"
        elif valor < 22:
            return "LIGERAMENTE FRÍO"
        elif valor < 25:
            return "CONFORTABLE"
        elif valor < 28:
            return "LIGERAMENTE CÁLIDO"
        elif valor < 32:
            return "CÁLIDO"
        else:
            return "MUY CÁLIDO"