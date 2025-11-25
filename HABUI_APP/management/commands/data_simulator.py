import csv
import time
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from pathlib import Path

class Command(BaseCommand):
    help = "Lee datos del CSV de energía y los envía por WebSocket al grupo 'energia'."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=3.0)

    def handle(self, *args, **options):
        intervalo = options['interval']
        channel_layer = get_channel_layer()
        data_file = Path(__file__).resolve().parent.parent.parent / "data" / "energia.csv"

        if not data_file.exists():
            self.stderr.write(f"❌ No se encontró el archivo: {data_file}")
            return

        try:
            with open(data_file, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                i = 0
                for row in reader:
                    data = {
                        "tension": float(row["Tensión/L1"]),
                        "corriente": float(row["Corriente/L1"]),
                        "potencia": float(row["P. Activa/L1 +"])
                    }

                    # Enviar al grupo WebSocket
                    async_to_sync(channel_layer.group_send)(
                        "energia",
                        {"type": "enviar_dato", "data": data}
                    )

                    self.stdout.write(f"[{i+1}] 🔌 Dato enviado: {data}")
                    i += 1
                    time.sleep(intervalo)
        except KeyboardInterrupt:
            self.stdout.write("⏹ Lectura interrumpida por el usuario.")
