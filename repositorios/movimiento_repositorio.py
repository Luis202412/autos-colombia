from datetime import datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from base_datos import sesion
from modelo.entidades import Movimiento, Vehiculo


def _con_relaciones():
    return select(Movimiento).options(
        joinedload(Movimiento.vehiculo).joinedload(Vehiculo.usuario),
        joinedload(Movimiento.celda),
        joinedload(Movimiento.operario_entrada),
        joinedload(Movimiento.operario_salida),
    )


class MovimientoRepositorio:
    def guardar(self, movimiento):
        sesion.add(movimiento)
        sesion.flush()
        return movimiento

    def confirmar(self):
        sesion.commit()

    def deshacer(self):
        sesion.rollback()

    def buscar_abierto_por_vehiculo(self, id_vehiculo):
        consulta = _con_relaciones().where(
            Movimiento.id_vehiculo == id_vehiculo, Movimiento.fecha_hora_salida.is_(None)
        )
        return sesion.scalars(consulta).unique().first()

    def listar_abiertos(self, placa=None, tipo=None):
        consulta = _con_relaciones().where(Movimiento.fecha_hora_salida.is_(None))
        if placa or tipo:
            consulta = consulta.join(Movimiento.vehiculo)
            if placa:
                consulta = consulta.where(Vehiculo.placa.like(f"%{placa}%"))
            if tipo:
                consulta = consulta.where(Vehiculo.tipo == tipo)
        consulta = consulta.order_by(Movimiento.fecha_hora_entrada)
        return list(sesion.scalars(consulta).unique())

    def contar_abiertos(self):
        consulta = select(func.count()).select_from(Movimiento).where(Movimiento.fecha_hora_salida.is_(None))
        return sesion.scalar(consulta)

    def contar_eventos_del_dia(self, dia):
        """Entradas mas salidas registradas en el dia dado."""
        inicio = datetime.combine(dia, time.min)
        fin = inicio + timedelta(days=1)
        entradas = select(func.count()).select_from(Movimiento).where(
            Movimiento.fecha_hora_entrada >= inicio, Movimiento.fecha_hora_entrada < fin
        )
        salidas = select(func.count()).select_from(Movimiento).where(
            Movimiento.fecha_hora_salida >= inicio, Movimiento.fecha_hora_salida < fin
        )
        return sesion.scalar(entradas) + sesion.scalar(salidas)

    def listar_recientes(self, limite):
        ultimo = func.coalesce(Movimiento.fecha_hora_salida, Movimiento.fecha_hora_entrada)
        consulta = _con_relaciones().order_by(ultimo.desc()).limit(limite)
        return list(sesion.scalars(consulta).unique())

    def buscar_historial(self, placa=None, desde=None, hasta=None, limite=300):
        consulta = _con_relaciones().join(Movimiento.vehiculo)
        if placa:
            consulta = consulta.where(Vehiculo.placa.like(f"%{placa}%"))
        if desde:
            consulta = consulta.where(Movimiento.fecha_hora_entrada >= datetime.combine(desde, time.min))
        if hasta:
            consulta = consulta.where(
                Movimiento.fecha_hora_entrada < datetime.combine(hasta, time.min) + timedelta(days=1)
            )
        consulta = consulta.order_by(Movimiento.fecha_hora_entrada.desc()).limit(limite)
        return list(sesion.scalars(consulta).unique())
