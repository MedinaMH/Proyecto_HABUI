# HABUI_APP/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AguaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "agua"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("✅ WebSocket conectado al grupo:", self.group_name)
        print("🔍 Channel layer:", self.channel_layer)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("❌ WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("🚀 Enviado al WebSocket:", data)
        print("📡 Evento recibido en enviar_dato:", event)

class EnergiaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "energia"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("⚡ WebSocket conectado al grupo:", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("❌ WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("🚀 Enviado dato de energía:", data)


