from sqlalchemy import func, select

from base_datos import sesion
from modelo.entidades import Celda, EstadoCelda


class CeldaRepositorio:
    def buscar_por_codigo(self, codigo):
        return sesion.scalar(select(Celda).where(Celda.codigo == codigo))

    def buscar_primera_libre(self, tipo):
        consulta = (
            select(Celda)
            .where(Celda.tipo == tipo, Celda.estado == EstadoCelda.LIBRE)
            .order_by(Celda.codigo)
            .limit(1)
        )
        return sesion.scalar(consulta)

    def listar_por_tipo(self, tipo):
        return list(sesion.scalars(select(Celda).where(Celda.tipo == tipo).order_by(Celda.codigo)))

    def contar(self, tipo, estado=None):
        consulta = select(func.count()).select_from(Celda).where(Celda.tipo == tipo)
        if estado is not None:
            consulta = consulta.where(Celda.estado == estado)
        return sesion.scalar(consulta)
