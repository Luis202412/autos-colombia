from sqlalchemy import select

from base_datos import sesion
from modelo.entidades import Operario


class OperarioRepositorio:
    def buscar_por_usuario(self, usuario_sistema):
        return sesion.scalar(select(Operario).where(Operario.usuario_sistema == usuario_sistema))

    def buscar_por_id(self, id_operario):
        return sesion.get(Operario, id_operario)
