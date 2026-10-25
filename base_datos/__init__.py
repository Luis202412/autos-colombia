"""Conexion a SQLite y creacion de la base de datos."""
import os
import sqlite3

from sqlalchemy import create_engine, event
from sqlalchemy.orm import scoped_session, sessionmaker

sesion = scoped_session(sessionmaker(autoflush=True, expire_on_commit=False))
_motor = None


def _activar_llaves_foraneas(conexion, _registro):
    # SQLite solo controla las llaves foraneas si se activa en cada conexion
    cursor = conexion.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


def crear_base_si_no_existe(config):
    """Crea el archivo .db con el esquema y los datos de prueba la primera vez."""
    ruta = config["RUTA_BD"]
    if os.path.exists(ruta):
        return
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    conexion = sqlite3.connect(ruta)
    try:
        with open(config["RUTA_ESQUEMA"], encoding="utf-8") as f:
            conexion.executescript(f.read())
        if config["CARGAR_DATOS_PRUEBA"]:
            with open(config["RUTA_DATOS_PRUEBA"], encoding="utf-8") as f:
                conexion.executescript(f.read())
        conexion.commit()
    except Exception:
        conexion.close()
        os.remove(ruta)
        raise
    conexion.close()


def iniciar(config):
    global _motor
    crear_base_si_no_existe(config)
    _motor = create_engine(f"sqlite:///{config['RUTA_BD']}", future=True)
    event.listen(_motor, "connect", _activar_llaves_foraneas)
    sesion.configure(bind=_motor)
    return _motor
