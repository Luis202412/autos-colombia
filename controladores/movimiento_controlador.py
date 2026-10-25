from datetime import date, datetime, timedelta

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for

from controladores.autenticacion_controlador import administrador_requerido, login_requerido
from modelo.entidades import TipoVehiculo
from repositorios.celda_repositorio import CeldaRepositorio
from servicios import ErrorNegocio
from servicios.mensualidad_servicio import SIN_MENSUALIDAD, VENCIDA, VIGENTE
from servicios.movimiento_servicio import MovimientoServicio, formatear_permanencia, normalizar_placa

bp = Blueprint("movimiento", __name__)


def _flash_error(mensaje):
    """Evita mostrar dos veces el mismo error (el del POST y el de la consulta posterior)."""
    pendientes = [tuple(f) for f in session.get("_flashes", [])]
    if ("e", mensaje) not in pendientes:
        flash(mensaje, "e")


def _fecha(texto):
    try:
        return datetime.strptime(texto, "%Y-%m-%d").date() if texto else None
    except ValueError:
        return None


@bp.route("/")
@login_requerido
def panel():
    return render_template("panel.html", resumen=MovimientoServicio().resumen_panel())


# ----------------------------------------------------------------- entrada
@bp.route("/entrada", methods=["GET", "POST"])
@login_requerido
def entrada():
    servicio = MovimientoServicio()
    if request.method == "POST":
        placa = request.form.get("placa", "")
        try:
            movimiento = servicio.registrar_entrada(placa, g.operario.id_operario, request.form.get("celda") or None)
        except ErrorNegocio as error:
            flash(str(error), "e")
            return redirect(url_for("movimiento.entrada", placa=placa))
        flash(
            f"Entrada registrada. {movimiento.vehiculo.placa} quedó en la celda {movimiento.celda.codigo} "
            f"a las {movimiento.fecha_hora_entrada.strftime('%H:%M')}.", "o",
        )
        return redirect(url_for("movimiento.entrada"))

    placa = normalizar_placa(request.args.get("placa"))
    consulta = None
    if placa:
        try:
            consulta = servicio.consultar_entrada(placa)
        except ErrorNegocio as error:
            _flash_error(str(error))
    if consulta and not consulta.puede_entrar:
        session.pop("_flashes", None)  # el aviso ya se muestra dentro del panel
    tipo = consulta.vehiculo.tipo if consulta else TipoVehiculo.CARRO
    celdas = CeldaRepositorio().listar_por_tipo(tipo)
    return render_template(
        "entrada.html", placa=placa, consulta=consulta, tipo=tipo, celdas=celdas,
        ahora=datetime.now(), VIGENTE=VIGENTE, VENCIDA=VENCIDA, SIN_MENSUALIDAD=SIN_MENSUALIDAD,
    )


# ------------------------------------------------------------------ salida
@bp.route("/salida", methods=["GET", "POST"])
@login_requerido
def salida():
    servicio = MovimientoServicio()
    if request.method == "POST":
        placa = request.form.get("placa", "")
        try:
            movimiento = servicio.registrar_salida(placa, g.operario.id_operario)
        except ErrorNegocio as error:
            flash(str(error), "e")
            return redirect(url_for("movimiento.salida", placa=placa))
        flash(
            f"Salida registrada. {movimiento.vehiculo.placa} estuvo "
            f"{formatear_permanencia(movimiento.calcular_permanencia())} y la celda "
            f"{movimiento.celda.codigo} quedó libre.", "o",
        )
        return redirect(url_for("movimiento.salida"))

    placa = normalizar_placa(request.args.get("placa"))
    movimiento = estado = None
    if placa:
        try:
            movimiento, estado = servicio.consultar_salida(placa)
        except ErrorNegocio as error:
            _flash_error(str(error))
    ahora = datetime.now().replace(microsecond=0)
    permanencia = formatear_permanencia(movimiento.calcular_permanencia(ahora)) if movimiento else None
    return render_template(
        "salida.html", placa=placa, movimiento=movimiento, estado=estado, ahora=ahora,
        permanencia=permanencia, VIGENTE=VIGENTE,
    )


# ---------------------------------------------------------------- dentro
@bp.route("/vehiculos-dentro")
@login_requerido
def vehiculos_dentro():
    placa = request.args.get("placa", "")
    tipo_texto = request.args.get("tipo", "")
    tipo = TipoVehiculo[tipo_texto] if tipo_texto in TipoVehiculo.__members__ else None
    movimientos = MovimientoServicio().consultar_vehiculos_dentro(placa, tipo)
    ahora = datetime.now()
    filas = [(m, formatear_permanencia(m.calcular_permanencia(ahora))) for m in movimientos]
    return render_template(
        "vehiculos_dentro.html", filas=filas, placa=placa, tipo=tipo_texto, TipoVehiculo=TipoVehiculo, hoy=date.today()
    )


# --------------------------------------------------------------- historial
@bp.route("/historial")
@administrador_requerido
def historial():
    if "desde" in request.args or "hasta" in request.args or "placa" in request.args:
        desde, hasta = _fecha(request.args.get("desde")), _fecha(request.args.get("hasta"))
    else:
        hasta = date.today()
        desde = hasta - timedelta(days=2)
    placa = request.args.get("placa", "")
    movimientos = []
    try:
        movimientos = MovimientoServicio().consultar_historial(placa, desde, hasta)
    except ErrorNegocio as error:
        flash(str(error), "e")
    return render_template("historial.html", movimientos=movimientos, placa=placa, desde=desde, hasta=hasta)
