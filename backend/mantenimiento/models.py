from django.db import models

class Vehiculo(models.Model):
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    placa = models.CharField(max_length=50)

    def __str__(self):
        return self.marca

