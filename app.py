import secrets
from datetime import datetime

from flask import Flask, abort, render_template, request, session

import base_datos
from config import Config
from controladores import autenticacion_controlador, celda_controlador, movimiento_controlador
from servicios.movimiento_servicio import formatear_permanencia


def crear_app(config=None):
    app = Flask(__name__)
    app.config.from_object(config or Config)
    base_datos.iniciar(app.config)

    app.register_blueprint(autenticacion_controlador.bp)
    app.register_blueprint(movimiento_controlador.bp)
    app.register_blueprint(celda_controlador.bp)

    @app.teardown_appcontext
    def cerrar_sesion(_error=None):
        base_datos.sesion.remove()

    @app.before_request
    def revisar_csrf():
        if request.method == "POST":
            token = session.get("csrf")
            if not token or token != request.form.get("csrf"):
                abort(400, "Formulario vencido. Vuelve a cargar la página.")

    @app.context_processor
    def variables_de_plantilla():
        if "csrf" not in session:
            session["csrf"] = secrets.token_hex(16)
        return {"csrf_token": session["csrf"]}

    @app.template_filter("fecha")
    def filtro_fecha(valor):
        return valor.strftime("%d/%m/%Y") if valor else ""

    @app.template_filter("fecha_hora")
    def filtro_fecha_hora(valor):
        return valor.strftime("%d/%m/%Y %H:%M") if valor else ""

    @app.template_filter("hora")
    def filtro_hora(valor):
        return valor.strftime("%H:%M") if valor else ""

    @app.template_filter("permanencia")
    def filtro_permanencia(movimiento):
        return formatear_permanencia(movimiento.calcular_permanencia(datetime.now()))

    @app.errorhandler(400)
    def error_400(error):
        return render_template("error.html", titulo="Solicitud no válida", mensaje=error.description), 400

    @app.errorhandler(404)
    def error_404(_error):
        return render_template("error.html", titulo="Página no encontrada", mensaje="Esa dirección no existe."), 404

    return app


if __name__ == "__main__":
    crear_app().run(debug=True)
