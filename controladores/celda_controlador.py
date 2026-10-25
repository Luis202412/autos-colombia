from flask import Blueprint, jsonify, request

from controladores.autenticacion_controlador import login_requerido
from modelo.entidades import EstadoCelda, TipoVehiculo
from repositorios.celda_repositorio import CeldaRepositorio

bp = Blueprint("celda", __name__, url_prefix="/celdas")


@bp.route("/<tipo>")
@login_requerido
def listar(tipo):
    """Estado de las celdas de un tipo en JSON, lo usa el mapa de la pantalla de entrada."""
    try:
        tipo_vehiculo = TipoVehiculo[tipo.upper()]
    except KeyError:
        return jsonify({"error": "Tipo de vehículo no válido"}), 404
    celdas = CeldaRepositorio().listar_por_tipo(tipo_vehiculo)
    return jsonify({
        "tipo": tipo_vehiculo.name,
        "libres": sum(1 for c in celdas if c.estado == EstadoCelda.LIBRE),
        "celdas": [{"codigo": c.codigo, "estado": c.estado.name} for c in celdas],
    })
