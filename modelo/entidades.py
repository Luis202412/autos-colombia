"""Entidades del dominio y enumeraciones (paquete modelo)."""
import enum
from datetime import date, datetime, timedelta

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator
from werkzeug.security import check_password_hash

FORMATO_FECHA = "%Y-%m-%d"
FORMATO_FECHA_HORA = "%Y-%m-%d %H:%M:%S"


class TipoVehiculo(enum.Enum):
    CARRO = "Carro"
    MOTO = "Moto"


class EstadoCelda(enum.Enum):
    LIBRE = "Libre"
    OCUPADA = "Ocupada"
    MANTENIMIENTO = "Mantenimiento"


class RolOperario(enum.Enum):
    OPERARIO = "Operario"
    ADMINISTRADOR = "Administrador"


# --- tipos que guardan en SQLite como texto -------------------------------
class FechaISO(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, valor, dialect):
        return valor.strftime(FORMATO_FECHA) if valor else None

    def process_result_value(self, valor, dialect):
        return datetime.strptime(valor, FORMATO_FECHA).date() if valor else None


class FechaHoraISO(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, valor, dialect):
        return valor.strftime(FORMATO_FECHA_HORA) if valor else None

    def process_result_value(self, valor, dialect):
        return datetime.strptime(valor, FORMATO_FECHA_HORA) if valor else None


class EnumTexto(TypeDecorator):
    """Guarda el nombre del enum (CARRO, LIBRE...) en una columna TEXT."""
    impl = String
    cache_ok = True

    def __init__(self, clase_enum):
        super().__init__()
        self.clase_enum = clase_enum

    def process_bind_param(self, valor, dialect):
        return valor.name if valor is not None else None

    def process_result_value(self, valor, dialect):
        return self.clase_enum[valor] if valor is not None else None


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre_completo: Mapped[str] = mapped_column(String, nullable=False)
    documento: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    telefono: Mapped[str | None] = mapped_column(String)
    correo: Mapped[str | None] = mapped_column(String)

    vehiculos: Mapped[list["Vehiculo"]] = relationship(back_populates="usuario")

    def obtener_vehiculos(self):
        return list(self.vehiculos)


class Vehiculo(Base):
    __tablename__ = "vehiculo"

    id_vehiculo: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    placa: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    tipo: Mapped[TipoVehiculo] = mapped_column(EnumTexto(TipoVehiculo), nullable=False)
    marca: Mapped[str | None] = mapped_column(String)
    color: Mapped[str | None] = mapped_column(String)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuario.id_usuario"), nullable=False)

    usuario: Mapped[Usuario] = relationship(back_populates="vehiculos")
    mensualidades: Mapped[list["Mensualidad"]] = relationship(
        back_populates="vehiculo", order_by="Mensualidad.fecha_fin.desc()"
    )
    movimientos: Mapped[list["Movimiento"]] = relationship(back_populates="vehiculo")

    def esta_dentro(self):
        return any(m.esta_abierto() for m in self.movimientos)


class Mensualidad(Base):
    __tablename__ = "mensualidad"

    id_mensualidad: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_vehiculo: Mapped[int] = mapped_column(ForeignKey("vehiculo.id_vehiculo"), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(FechaISO, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(FechaISO, nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    vehiculo: Mapped[Vehiculo] = relationship(back_populates="mensualidades")

    def esta_vigente(self, fecha):
        return self.activa and self.fecha_inicio <= fecha <= self.fecha_fin


class Operario(Base):
    __tablename__ = "operario"

    id_operario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String, nullable=False)
    usuario_sistema: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    contrasena_hash: Mapped[str] = mapped_column(String, nullable=False)
    rol: Mapped[RolOperario] = mapped_column(EnumTexto(RolOperario), nullable=False)

    def autenticar(self, clave):
        return check_password_hash(self.contrasena_hash, clave)

    def es_administrador(self):
        return self.rol == RolOperario.ADMINISTRADOR

    @property
    def iniciales(self):
        partes = self.nombre.split()
        return "".join(p[0] for p in partes[:2]).upper()


class Celda(Base):
    __tablename__ = "celda"

    id_celda: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    tipo: Mapped[TipoVehiculo] = mapped_column(EnumTexto(TipoVehiculo), nullable=False)
    estado: Mapped[EstadoCelda] = mapped_column(
        EnumTexto(EstadoCelda), nullable=False, default=EstadoCelda.LIBRE
    )

    def ocupar(self):
        self.estado = EstadoCelda.OCUPADA

    def liberar(self):
        self.estado = EstadoCelda.LIBRE

    def esta_libre(self):
        return self.estado == EstadoCelda.LIBRE


class Movimiento(Base):
    __tablename__ = "movimiento"

    id_movimiento: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_vehiculo: Mapped[int] = mapped_column(ForeignKey("vehiculo.id_vehiculo"), nullable=False)
    id_celda: Mapped[int] = mapped_column(ForeignKey("celda.id_celda"), nullable=False)
    id_operario_entrada: Mapped[int] = mapped_column(ForeignKey("operario.id_operario"), nullable=False)
    id_operario_salida: Mapped[int | None] = mapped_column(ForeignKey("operario.id_operario"))
    fecha_hora_entrada: Mapped[datetime] = mapped_column(FechaHoraISO, nullable=False)
    fecha_hora_salida: Mapped[datetime | None] = mapped_column(FechaHoraISO)

    vehiculo: Mapped[Vehiculo] = relationship(back_populates="movimientos")
    celda: Mapped[Celda] = relationship()
    operario_entrada: Mapped[Operario] = relationship(foreign_keys=[id_operario_entrada])
    operario_salida: Mapped[Operario | None] = relationship(foreign_keys=[id_operario_salida])

    def esta_abierto(self):
        return self.fecha_hora_salida is None

    def calcular_permanencia(self, hasta=None):
        fin = self.fecha_hora_salida or hasta or datetime.now()
        return max(fin - self.fecha_hora_entrada, timedelta(0))
