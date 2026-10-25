from sqlalchemy import select

from base_datos import sesion
from modelo.entidades import Mensualidad, Vehiculo


class VehiculoRepositorio:
    def buscar_por_placa(self, placa):
        return sesion.scalar(select(Vehiculo).where(Vehiculo.placa == placa))

    def ultima_mensualidad(self, id_vehiculo):
        """Mensualidad activa con la fecha de fin mas lejana."""
        consulta = (
            select(Mensualidad)
            .where(Mensualidad.id_vehiculo == id_vehiculo, Mensualidad.activa.is_(True))
            .order_by(Mensualidad.fecha_fin.desc())
            .limit(1)
        )
        return sesion.scalar(consulta)
