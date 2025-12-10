# HABUI_APP/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

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