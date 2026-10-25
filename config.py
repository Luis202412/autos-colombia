import os

RAIZ = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "cambiar-esta-clave-en-produccion")
    RUTA_BD = os.environ.get("RUTA_BD", os.path.join(RAIZ, "base_datos", "autos_colombia.db"))
    RUTA_ESQUEMA = os.path.join(RAIZ, "base_datos", "esquema.sql")
    RUTA_DATOS_PRUEBA = os.path.join(RAIZ, "base_datos", "datos_prueba.sql")
    CARGAR_DATOS_PRUEBA = os.environ.get("CARGAR_DATOS_PRUEBA", "1") == "1"
