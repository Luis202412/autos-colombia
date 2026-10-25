from functools import wraps

from flask import Blueprint, flash, g, redirect, render_template, request, session, url_for

from servicios import ErrorNegocio
from servicios.autenticacion_servicio import AutenticacionServicio

bp = Blueprint("autenticacion", __name__)


def login_requerido(vista):
    @wraps(vista)
    def envoltura(*args, **kwargs):
        if g.operario is None:
            return redirect(url_for("autenticacion.login", siguiente=request.path))
        return vista(*args, **kwargs)
    return envoltura


def administrador_requerido(vista):
    @wraps(vista)
    @login_requerido
    def envoltura(*args, **kwargs):
        if not g.operario.es_administrador():
            flash("Esta pantalla es solo para el administrador.", "e")
            return redirect(url_for("movimiento.panel"))
        return vista(*args, **kwargs)
    return envoltura


@bp.before_app_request
def cargar_operario():
    id_operario = session.get("id_operario")
    g.operario = AutenticacionServicio().obtener_operario(id_operario) if id_operario else None
    if id_operario and g.operario is None:
        session.clear()


@bp.route("/login", methods=["GET", "POST"])
def login():
    if g.operario is not None:
        return redirect(url_for("movimiento.panel"))
    usuario = ""
    if request.method == "POST":
        usuario = request.form.get("usuario", "")
        try:
            operario = AutenticacionServicio().iniciar_sesion(usuario, request.form.get("clave", ""))
        except ErrorNegocio as error:
            flash(str(error), "e")
        else:
            session.clear()
            session["id_operario"] = operario.id_operario
            siguiente = request.args.get("siguiente", "")
            if not siguiente.startswith("/") or siguiente.startswith("//"):
                siguiente = url_for("movimiento.panel")
            return redirect(siguiente)
    return render_template("login.html", usuario=usuario)


@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("autenticacion.login"))
