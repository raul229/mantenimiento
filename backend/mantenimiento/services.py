from django.utils import timezone
from .models import Mantenimiento

class MantenimientoService:
    @staticmethod
    def crear_mantenimiento(vehiculo, fallas_ids, **data):
        mantenimiento = Mantenimiento.objects.create(
            vehiculo=vehiculo,
            **data
        )
        mantenimiento.fallas.set(fallas_ids)
        mantenimiento.fallas.filter(estado='pendiente').update(estado='solucionado', fecha_solucionado=timezone.now())
        return mantenimiento