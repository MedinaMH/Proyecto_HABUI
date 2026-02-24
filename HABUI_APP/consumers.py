# HABUI_APP/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from HABUI_APP.management.process_manager import process_manager 

class AguaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "agua"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("WebSocket conectado al grupo:", self.group_name)
        print("Channel layer:", self.channel_layer)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado al WebSocket:", data)
        print("Evento recibido en enviar_dato:", event)

class EnergiaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "energia"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("WebSocket conectado al grupo:", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado dato de energía:", data)

class OxigenoConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("oxigeno", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal O₂")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("oxigeno", self.channel_name)
        print("Cliente desconectado del canal O₂")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class CO2Consumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("co2", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal CO₂")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("co2", self.channel_name)
        print("Cliente desconectado del canal CO₂")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class TemperaturaConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("temperatura", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal temperatura")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("temperatura", self.channel_name)
        print("Cliente desconectado del canal temperatura")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class HumedadConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("humedad", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal humedad")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("humedad", self.channel_name)
        print("Cliente desconectado del canal humedad")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class TemperaturaAlimentosConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("temperatura_alimentos", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal Temperatura Alimentos")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("temperatura_alimentos", self.channel_name)
        print("Cliente desconectado del canal Temperatura Alimentos")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class SimulacionConsumer(AsyncWebsocketConsumer):
    """WebSocket para monitorear simulaciones"""
    
    async def connect(self):
        self.simulacion_id = self.scope['url_route']['kwargs']['simulacion_id']
        self.group_name = f'simulacion_{self.simulacion_id}'
        
        # Verificar que la simulación existe
        simulacion = process_manager.obtener_simulacion(self.simulacion_id)
        
        if simulacion:
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()
            
            # Enviar logs históricos al conectar
            await self.enviar_logs_historicos()
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Recibe comandos desde el frontend"""
        try:
            data = json.loads(text_data)
            comando = data.get('comando')
            
            if comando == 'detener':
                await self.detener_simulacion()
        except:
            pass
    
    async def log_message(self, event):
        """Envía logs al cliente"""
        await self.send(text_data=json.dumps({
            'tipo': 'log',
            'message': event['message'],
            'timestamp': event.get('timestamp', '')
        }))
    
    async def estado_update(self, event):
        """Envía actualización de estado"""
        await self.send(text_data=json.dumps({
            'tipo': 'estado',
            'estado': event['estado']
        }))
    
    async def enviar_logs_historicos(self):
        """Envía logs históricos al cliente"""
        logs = process_manager.obtener_logs(self.simulacion_id, 50)
        
        if logs:
            await self.send(text_data=json.dumps({
                'tipo': 'logs_historicos',
                'logs': logs
            }))
    
    async def detener_simulacion(self):
        """Detiene la simulación"""
        detenido = process_manager.detener_simulacion(self.simulacion_id)
        
        if detenido:
            await self.send(text_data=json.dumps({
                'tipo': 'estado',
                'estado': 'detenida',
                'message': 'Simulación detenida'
            }))