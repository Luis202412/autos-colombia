import re
from datetime import date, datetime

from modelo.entidades import EstadoCelda, Movimiento, TipoVehiculo
from repositorios.celda_repositorio import CeldaRepositorio
from repositorios.movimiento_repositorio import MovimientoRepositorio
from repositorios.vehiculo_repositorio import VehiculoRepositorio
from servicios import ErrorNegocio
from servicios.mensualidad_servicio import (
    SIN_MENSUALIDAD, VENCIDA, VIGENTE, MensualidadServicio,
)

# Carros: tres letras y tres numeros. Motos: tres letras, dos numeros y una letra
PATRON_PLACA = re.compile(r"^[A-Z]{3}\d{2}[A-Z0-9]$")


def normalizar_placa(placa):
    return re.sub(r"[\s\-]", "", (placa or "")).upper()


def formatear_permanencia(duracion):
    minutos = int(duracion.total_seconds() // 60)
    return f"{minutos // 60} h {minutos % 60:02d} min"


class ConsultaEntrada:
    """Lo que ve el operario despues de buscar una placa para registrar entrada."""

    def __init__(self, vehiculo, estado, mensualidad, celda_sugerida, ya_dentro, sin_celdas):
        self.vehiculo = vehiculo
        self.estado = estado
        self.mensualidad = mensualidad
        self.celda_sugerida = celda_sugerida
        self.ya_dentro = ya_dentro
        self.sin_celdas = sin_celdas

    @property
    def puede_entrar(self):
        return self.estado == VIGENTE and not self.ya_dentro and not self.sin_celdas


class MovimientoServicio:
    def __init__(self):
        self.vehiculos = VehiculoRepositorio()
        self.celdas = CeldaRepositorio()
        self.movimientos = MovimientoRepositorio()
        self.mensualidades = MensualidadServicio()

    # ------------------------------------------------------------ utilidades
    def _buscar_vehiculo(self, placa):
        placa = normalizar_placa(placa)
        if not placa:
            raise ErrorNegocio("Escribe la placa del vehículo.")
        if not PATRON_PLACA.match(placa):
            raise ErrorNegocio("La placa no tiene un formato válido. Ejemplos: ABC123 o ABC12D.")
        vehiculo = self.vehiculos.buscar_por_placa(placa)
        if vehiculo is None:
            raise ErrorNegocio(f"La placa {placa} no está registrada en el parqueadero.")
        return vehiculo

    # --------------------------------------------------------------- entrada
    def consultar_entrada(self, placa):
        vehiculo = self._buscar_vehiculo(placa)
        estado, mensualidad = self.mensualidades.consultar_estado(vehiculo)
        abierto = self.movimientos.buscar_abierto_por_vehiculo(vehiculo.id_vehiculo)
        sugerida = None
        sin_celdas = False
        if estado == VIGENTE and abierto is None:
            sugerida = self.celdas.buscar_primera_libre(vehiculo.tipo)
            sin_celdas = sugerida is None
        return ConsultaEntrada(vehiculo, estado, mensualidad, sugerida, abierto is not None, sin_celdas)

    def registrar_entrada(self, placa, id_operario, codigo_celda=None):
        vehiculo = self._buscar_vehiculo(placa)
        estado, mensualidad = self.mensualidades.consultar_estado(vehiculo)
        if estado == SIN_MENSUALIDAD:
            raise ErrorNegocio(f"La placa {vehiculo.placa} no tiene una mensualidad registrada.")
        if estado == VENCIDA:
            raise ErrorNegocio(
                f"La mensualidad de la placa {vehiculo.placa} venció el "
                f"{mensualidad.fecha_fin.strftime('%d/%m/%Y')}. Pide al usuario que renueve en administración."
            )
        if self.movimientos.buscar_abierto_por_vehiculo(vehiculo.id_vehiculo) is not None:
            raise ErrorNegocio(f"El vehículo {vehiculo.placa} ya está dentro del parqueadero.")

        if codigo_celda:
            celda = self.celdas.buscar_por_codigo(codigo_celda)
            if celda is None or celda.tipo != vehiculo.tipo:
                raise ErrorNegocio(f"La celda {codigo_celda} no sirve para este tipo de vehículo.")
            if not celda.esta_libre():
                raise ErrorNegocio(f"La celda {celda.codigo} no está libre. Escoge otra.")
        else:
            celda = self.celdas.buscar_primera_libre(vehiculo.tipo)
            if celda is None:
                raise ErrorNegocio(f"No quedan celdas libres para {vehiculo.tipo.value.lower()}s.")

        try:
            celda.ocupar()
            movimiento = Movimiento(
                id_vehiculo=vehiculo.id_vehiculo,
                id_celda=celda.id_celda,
                id_operario_entrada=id_operario,
                fecha_hora_entrada=datetime.now().replace(microsecond=0),
            )
            self.movimientos.guardar(movimiento)
            self.movimientos.confirmar()
        except Exception:
            self.movimientos.deshacer()
            raise
        return movimiento

    # ---------------------------------------------------------------- salida
    def consultar_salida(self, placa):
        """Devuelve (movimiento abierto, estado de la mensualidad)."""
        vehiculo = self._buscar_vehiculo(placa)
        movimiento = self.movimientos.buscar_abierto_por_vehiculo(vehiculo.id_vehiculo)
        if movimiento is None:
            raise ErrorNegocio(f"El vehículo {vehiculo.placa} no está dentro del parqueadero.")
        estado, _ = self.mensualidades.consultar_estado(vehiculo)
        return movimiento, estado

    def registrar_salida(self, placa, id_operario):
        movimiento, _ = self.consultar_salida(placa)
        try:
            movimiento.fecha_hora_salida = datetime.now().replace(microsecond=0)
            movimiento.id_operario_salida = id_operario
            movimiento.celda.liberar()
            self.movimientos.confirmar()
        except Exception:
            self.movimientos.deshacer()
            raise
        return movimiento

    # ------------------------------------------------------------ consultas
    def consultar_vehiculos_dentro(self, placa=None, tipo=None):
        placa = normalizar_placa(placa) or None
        return self.movimientos.listar_abiertos(placa, tipo)

    def consultar_historial(self, placa=None, desde=None, hasta=None):
        if desde and hasta and desde > hasta:
            raise ErrorNegocio("La fecha inicial no puede ser mayor que la fecha final.")
        placa = normalizar_placa(placa) or None
        return self.movimientos.buscar_historial(placa, desde, hasta)

    def consultar_disponibilidad(self, tipo):
        total = self.celdas.contar(tipo)
        libres = self.celdas.contar(tipo, EstadoCelda.LIBRE)
        return libres, total

    def resumen_panel(self):
        libres_carros, total_carros = self.consultar_disponibilidad(TipoVehiculo.CARRO)
        libres_motos, total_motos = self.consultar_disponibilidad(TipoVehiculo.MOTO)
        return {
            "libres_carros": libres_carros, "total_carros": total_carros,
            "libres_motos": libres_motos, "total_motos": total_motos,
            "dentro": self.movimientos.contar_abiertos(),
            "movimientos_hoy": self.movimientos.contar_eventos_del_dia(date.today()),
            "ultimos": self.ultimos_eventos(5),
        }

    def ultimos_eventos(self, cantidad):
        """Entradas y salidas mezcladas y ordenadas de la mas reciente a la mas vieja."""
        eventos = []
        for m in self.movimientos.listar_recientes(cantidad):
            eventos.append((m.fecha_hora_entrada, "Entrada", m))
            if m.fecha_hora_salida:
                eventos.append((m.fecha_hora_salida, "Salida", m))
        eventos.sort(key=lambda e: e[0], reverse=True)
        return eventos[:cantidad]
