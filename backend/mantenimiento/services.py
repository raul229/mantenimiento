from django.utils import timezone
from .models import Mantenimiento

class MantenimientoService:
    
    @staticmethod
    def marcar_fallas_solucionadas(mantenimiento):
        mantenimiento.fallas.filter(
            estado="pendiente"
            ).update(
                estado="solucionado",
                fecha_solucionado=timezone.now()
            )
    
    
    
    
    @staticmethod
    def crear_mantenimiento(vehiculo, fallas, **data):
        mantenimiento = Mantenimiento.objects.create(
            vehiculo=vehiculo,
            **data
        )
        mantenimiento.fallas.set(fallas)
        MantenimientoService.marcar_fallas_solucionadas(mantenimiento)
        return mantenimiento
    
    @staticmethod
    def actualizar_mantenimiento(mantenimiento, vehiculo=None, fallas=None,**data):
        
        for campo, valor in data.items():
            setattr(mantenimiento, campo, valor)
        
        mantenimiento.save()
            
        if vehiculo is not None:
            mantenimiento.vehiculo = vehiculo
        if fallas is not None:
            mantenimiento.fallas.set(fallas)
            MantenimientoService.marcar_fallas_solucionadas(mantenimiento)
        return mantenimiento