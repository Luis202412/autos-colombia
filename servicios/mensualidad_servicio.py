from datetime import date

from repositorios.vehiculo_repositorio import VehiculoRepositorio

VIGENTE = "vigente"
VENCIDA = "vencida"
SIN_MENSUALIDAD = "sin_mensualidad"


class MensualidadServicio:
    def __init__(self):
        self.vehiculos = VehiculoRepositorio()

    def consultar_estado(self, vehiculo, fecha=None):
        """Devuelve (estado, mensualidad) de un vehiculo para la fecha dada."""
        fecha = fecha or date.today()
        mensualidad = self.vehiculos.ultima_mensualidad(vehiculo.id_vehiculo)
        if mensualidad is None:
            return SIN_MENSUALIDAD, None
        if mensualidad.esta_vigente(fecha):
            return VIGENTE, mensualidad
        return VENCIDA, mensualidad
