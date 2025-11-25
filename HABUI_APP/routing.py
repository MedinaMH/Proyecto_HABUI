# HABUI_APP/routing.py
from django.urls import re_path
from . import consumers
from HABUI_APP.consumers import AguaConsumer

websocket_urlpatterns = [
    re_path(r"ws/agua/$", AguaConsumer.as_asgi()),
    re_path(r'ws/energia/$', consumers.EnergiaConsumer.as_asgi()),
]
