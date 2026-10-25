from repositorios.operario_repositorio import OperarioRepositorio
from servicios import ErrorNegocio


class AutenticacionServicio:
    def __init__(self):
        self.operarios = OperarioRepositorio()

    def iniciar_sesion(self, usuario, clave):
        usuario = (usuario or "").strip()
        if not usuario or not clave:
            raise ErrorNegocio("Escribe tu usuario y tu contraseña.")
        operario = self.operarios.buscar_por_usuario(usuario)
        if operario is None or not operario.autenticar(clave):
            raise ErrorNegocio("Usuario o contraseña incorrectos.")
        return operario

    def obtener_operario(self, id_operario):
        return self.operarios.buscar_por_id(id_operario)
