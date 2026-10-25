-- Autos Colombia - Iteracion 1: gestion de entrada y salida de vehiculos
-- Fechas en texto ISO (YYYY-MM-DD y YYYY-MM-DD HH:MM:SS), booleanos como 0 y 1

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo  TEXT NOT NULL,
    documento        TEXT NOT NULL UNIQUE,
    telefono         TEXT,
    correo           TEXT
);

CREATE TABLE IF NOT EXISTS vehiculo (
    id_vehiculo  INTEGER PRIMARY KEY AUTOINCREMENT,
    placa        TEXT NOT NULL UNIQUE,
    tipo         TEXT NOT NULL CHECK (tipo IN ('CARRO', 'MOTO')),
    marca        TEXT,
    color        TEXT,
    id_usuario   INTEGER NOT NULL REFERENCES usuario (id_usuario)
);

CREATE TABLE IF NOT EXISTS mensualidad (
    id_mensualidad  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vehiculo     INTEGER NOT NULL REFERENCES vehiculo (id_vehiculo),
    fecha_inicio    TEXT NOT NULL,
    fecha_fin       TEXT NOT NULL,
    activa          INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE IF NOT EXISTS operario (
    id_operario      INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT NOT NULL,
    usuario_sistema  TEXT NOT NULL UNIQUE,
    contrasena_hash  TEXT NOT NULL,
    rol              TEXT NOT NULL CHECK (rol IN ('OPERARIO', 'ADMINISTRADOR'))
);

CREATE TABLE IF NOT EXISTS celda (
    id_celda  INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo    TEXT NOT NULL UNIQUE,
    tipo      TEXT NOT NULL CHECK (tipo IN ('CARRO', 'MOTO')),
    estado    TEXT NOT NULL DEFAULT 'LIBRE' CHECK (estado IN ('LIBRE', 'OCUPADA', 'MANTENIMIENTO'))
);

CREATE TABLE IF NOT EXISTS movimiento (
    id_movimiento        INTEGER PRIMARY KEY AUTOINCREMENT,
    id_vehiculo          INTEGER NOT NULL REFERENCES vehiculo (id_vehiculo),
    id_celda             INTEGER NOT NULL REFERENCES celda (id_celda),
    id_operario_entrada  INTEGER NOT NULL REFERENCES operario (id_operario),
    id_operario_salida   INTEGER REFERENCES operario (id_operario),
    fecha_hora_entrada   TEXT NOT NULL,
    fecha_hora_salida    TEXT,
    CHECK (fecha_hora_salida IS NULL OR fecha_hora_salida >= fecha_hora_entrada)
);

-- Un vehiculo y una celda solo pueden tener un movimiento abierto a la vez
CREATE UNIQUE INDEX IF NOT EXISTS ux_movimiento_vehiculo_abierto
    ON movimiento (id_vehiculo) WHERE fecha_hora_salida IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_movimiento_celda_abierta
    ON movimiento (id_celda) WHERE fecha_hora_salida IS NULL;

CREATE INDEX IF NOT EXISTS ix_movimiento_entrada ON movimiento (fecha_hora_entrada);
CREATE INDEX IF NOT EXISTS ix_mensualidad_vehiculo ON mensualidad (id_vehiculo, fecha_fin);
